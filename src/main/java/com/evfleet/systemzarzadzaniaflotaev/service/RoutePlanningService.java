package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.RouteResponseDto;
import com.evfleet.systemzarzadzaniaflotaev.exception.RouteNotFeasibleException;
import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.repository.ChargingStationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class RoutePlanningService {

    // Stacje oddalone od trasy o więcej niż tyle metrów nie są brane pod uwagę
    private static final double STATION_CORRIDOR_METERS = 5000;
    private static final int MAX_ROUTE_POINTS_IN_QUERY = 500;

    private final RouteService routeService;
    private final VehicleRepository vehicleRepository;
    private final ChargingStationRepository stationRepository;
    private final BatterySimulationService batterySimulationService;
    private final ChargingStopPlanner chargingStopPlanner;

    public RoutePlanResult planRoute(Long vehicleId, double startLon, double startLat, double endLon, double endLat, double temperature) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono pojazdu"));

        double consumption = batterySimulationService.getConsumption(vehicle, temperature);
        double capacityKWh = vehicle.getBatteryCapacityKWh();
        double currentEnergyKWh = vehicle.getStateOfCharge() / 100.0 * capacityKWh;
        double reserveKWh = BatterySimulationService.RESERVE_PERCENT / 100.0 * capacityKWh;

        RouteResponseDto.Route directRoute = routeService.getRoute(startLon, startLat, endLon, endLat);
        List<List<Double>> directLine = directRoute.getGeometry().getCoordinates();

        List<ChargingStation> stationsOnRoute = stationRepository.findStationsAlongLine(toWkt(directLine), STATION_CORRIDOR_METERS);
        List<ChargingStopPlanner.PlannedStop> stops = chargingStopPlanner
                .plan(directLine, stationsOnRoute, currentEnergyKWh, capacityKWh, consumption, reserveKWh)
                .orElseThrow(() -> new RouteNotFeasibleException(
                        "Pojazd " + vehicle.getRegistrationNumber() + " nie przejedzie tej trasy tam i z powrotem: "
                                + "brak odpowiednich stacji ładowania dla maksymalnie dwóch postojów."));

        RouteResponseDto.Route finalRoute = stops.isEmpty() ? directRoute : routeThroughStops(stops, startLon, startLat, endLon, endLat);

        RoutePlanResult result = new RoutePlanResult();
        result.setAssignedVehicleId(vehicle.getId());
        result.setVehicleRegistrationNumber(vehicle.getRegistrationNumber());
        result.setReturnBaseName(vehicle.getCurrentBase());
        result.setTemperatureC(temperature);
        result.setConsumptionKWhPerKm(consumption);
        result.setCurrentRangeKm(currentEnergyKWh / consumption);
        result.setTotalDistanceKm(finalRoute.getDistance() / 1000.0);
        result.setTotalDurationMinutes(finalRoute.getDuration() / 60.0);
        result.setRouteCoordinates(finalRoute.getGeometry().getCoordinates());
        result.setRequiresChargingStop(!stops.isEmpty());
        result.setChargingStops(stops.stream().map(this::toChargingStop).toList());
        return result;
    }

    private RouteResponseDto.Route routeThroughStops(List<ChargingStopPlanner.PlannedStop> stops,
                                                     double startLon, double startLat, double endLon, double endLat) {
        List<double[]> points = new ArrayList<>();
        points.add(new double[]{startLon, startLat});
        stops.forEach(stop -> points.add(new double[]{stop.station().getLocation().getX(), stop.station().getLocation().getY()}));
        points.add(new double[]{endLon, endLat});
        return routeService.getRouteThroughPoints(points);
    }

    private ChargingStop toChargingStop(ChargingStopPlanner.PlannedStop stop) {
        ChargingStation station = stop.station();
        return new ChargingStop(station.getName(), station.getLocation().getY(), station.getLocation().getX(),
                station.getPowerKW(), stop.distanceFromStartKm(), stop.chargeKWh(), stop.chargingMinutes());
    }

    // Trasa jest przerzedzana, bo do znalezienia stacji w korytarzu nie potrzeba wszystkich punktów
    private String toWkt(List<List<Double>> line) {
        int step = Math.max(1, line.size() / MAX_ROUTE_POINTS_IN_QUERY);
        String points = IntStream.range(0, line.size())
                .filter(i -> i % step == 0 || i == line.size() - 1)
                .mapToObj(i -> String.format(Locale.US, "%.6f %.6f", line.get(i).get(0), line.get(i).get(1)))
                .collect(Collectors.joining(","));
        return "LINESTRING(" + points + ")";
    }

    public record ChargingStop(String name, double latitude, double longitude, double powerKW,
                               double distanceFromStartKm, double chargeKWh, double chargingMinutes) {
    }

    @lombok.Getter @lombok.Setter
    public static class RoutePlanResult {
        private Long assignedVehicleId;
        private String vehicleRegistrationNumber;
        private String returnBaseName;
        private double totalDistanceKm;
        private double totalDurationMinutes;
        private double currentRangeKm;
        private boolean requiresChargingStop;
        private List<List<Double>> routeCoordinates;
        private List<ChargingStop> chargingStops;
        private double temperatureC;
        private double consumptionKWhPerKm;

        public double getEnergyRequiredKWh() {
            return totalDistanceKm * consumptionKWhPerKm;
        }

        // Nazwy pól, których oczekuje frontend
        public double getDistanceKm() {
            return totalDistanceKm;
        }

        public double getVehicleRangeKm() {
            return currentRangeKm;
        }
    }
}
