package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static com.evfleet.systemzarzadzaniaflotaev.service.GeoDistance.haversineKm;

/**
 * Dobiera przystanki ładowania na trasie do celu tak, aby pojazd dojechał i wrócił do bazy
 * z rezerwą energii. Szuka najmniejszej liczby postojów: 0, potem 1, potem 2.
 */
@Component
public class ChargingStopPlanner {

    public record PlannedStop(ChargingStation station, double distanceFromStartKm, double chargeKWh, double chargingMinutes) {
    }

    private record Candidate(ChargingStation station, double distanceFromStartKm, double offsetKm) {
        boolean available() {
            return Boolean.TRUE.equals(station.getIsAvailable());
        }

        double power() {
            return station.getPowerKW() != null && station.getPowerKW() > 0
                    ? station.getPowerKW() : BatterySimulationService.DEFAULT_CHARGER_POWER_KW;
        }
    }

    // Wolne stacje mają pierwszeństwo, potem szybsze i bliżej trasy
    private static final Comparator<Candidate> BEST_STOP = Comparator
            .comparing(Candidate::available, Comparator.reverseOrder())
            .thenComparing(Candidate::power, Comparator.reverseOrder())
            .thenComparingDouble(Candidate::offsetKm);

    private static final Comparator<List<Candidate>> BEST_PAIR = Comparator
            .<List<Candidate>>comparingLong(pair -> pair.stream().filter(Candidate::available).count()).reversed()
            .thenComparing(pair -> Math.min(pair.get(0).power(), pair.get(1).power()), Comparator.reverseOrder())
            .thenComparingDouble(pair -> pair.get(0).offsetKm() + pair.get(1).offsetKm());

    /**
     * @param routeLine punkty trasy do celu jako [długość, szerokość]
     * @return przystanki w kolejności jazdy (pusta lista = ładowanie niepotrzebne)
     *         albo Optional.empty(), gdy nie da się przejechać trasy z maksymalnie dwoma postojami
     */
    public Optional<List<PlannedStop>> plan(List<List<Double>> routeLine, List<ChargingStation> stations,
                                            double startEnergyKWh, double capacityKWh, double consumption, double reserveKWh) {
        double[] kmAlongRoute = cumulativeKm(routeLine);
        double roundTripKm = 2 * kmAlongRoute[kmAlongRoute.length - 1];

        double firstReachKm = (startEnergyKWh - reserveKWh) / consumption;
        if (firstReachKm >= roundTripKm) {
            return Optional.of(List.of());
        }
        double fullChargeReachKm = (capacityKWh - reserveKWh) / consumption;
        // Z ostatniego przystanku pojazd musi dojechać do celu i wrócić do bazy
        double lastStopMinKm = roundTripKm - fullChargeReachKm;

        List<Candidate> all = stations.stream()
                .map(station -> toCandidate(station, routeLine, kmAlongRoute))
                .toList();
        List<Candidate> reachable = all.stream()
                .filter(candidate -> candidate.distanceFromStartKm() <= firstReachKm)
                .toList();

        Optional<Candidate> singleStop = reachable.stream()
                .filter(candidate -> candidate.distanceFromStartKm() >= lastStopMinKm)
                .min(BEST_STOP);
        if (singleStop.isPresent()) {
            return Optional.of(withCharging(List.of(singleStop.get()), roundTripKm, startEnergyKWh, consumption, reserveKWh));
        }

        List<List<Candidate>> pairs = new ArrayList<>();
        for (Candidate first : reachable) {
            for (Candidate second : all) {
                double gapKm = second.distanceFromStartKm() - first.distanceFromStartKm();
                if (gapKm > 0 && gapKm <= fullChargeReachKm && second.distanceFromStartKm() >= lastStopMinKm) {
                    pairs.add(List.of(first, second));
                }
            }
        }
        return pairs.stream()
                .min(BEST_PAIR)
                .map(pair -> withCharging(pair, roundTripKm, startEnergyKWh, consumption, reserveKWh));
    }

    // Na każdym postoju ładujemy tylko tyle, ile trzeba do następnego punktu z zachowaniem rezerwy
    private List<PlannedStop> withCharging(List<Candidate> stops, double roundTripKm, double startEnergyKWh,
                                           double consumption, double reserveKWh) {
        List<PlannedStop> planned = new ArrayList<>();
        double energyKWh = startEnergyKWh;
        double previousKm = 0;

        for (int i = 0; i < stops.size(); i++) {
            Candidate stop = stops.get(i);
            energyKWh -= (stop.distanceFromStartKm() - previousKm) * consumption;

            double nextPointKm = i + 1 < stops.size() ? stops.get(i + 1).distanceFromStartKm() : roundTripKm;
            double neededKWh = (nextPointKm - stop.distanceFromStartKm()) * consumption + reserveKWh;
            double chargeKWh = Math.max(0, neededKWh - energyKWh);
            double minutes = chargeKWh / (stop.power() * BatterySimulationService.CHARGING_EFFICIENCY) * 60;

            planned.add(new PlannedStop(stop.station(), stop.distanceFromStartKm(), chargeKWh, minutes));
            energyKWh += chargeKWh;
            previousKm = stop.distanceFromStartKm();
        }
        return planned;
    }

    // Stacja zajmuje na trasie miejsce najbliższego jej punktu trasy
    private Candidate toCandidate(ChargingStation station, List<List<Double>> routeLine, double[] kmAlongRoute) {
        double stationLon = station.getLocation().getX();
        double stationLat = station.getLocation().getY();

        int nearestIndex = 0;
        double nearestKm = Double.MAX_VALUE;
        for (int i = 0; i < routeLine.size(); i++) {
            double km = haversineKm(stationLon, stationLat, routeLine.get(i).get(0), routeLine.get(i).get(1));
            if (km < nearestKm) {
                nearestKm = km;
                nearestIndex = i;
            }
        }
        return new Candidate(station, kmAlongRoute[nearestIndex], nearestKm);
    }

    private double[] cumulativeKm(List<List<Double>> routeLine) {
        double[] km = new double[routeLine.size()];
        for (int i = 1; i < routeLine.size(); i++) {
            List<Double> previous = routeLine.get(i - 1);
            List<Double> current = routeLine.get(i);
            km[i] = km[i - 1] + haversineKm(previous.get(0), previous.get(1), current.get(0), current.get(1));
        }
        return km;
    }
}
