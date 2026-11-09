package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.ChargingStationDto;
import com.evfleet.systemzarzadzaniaflotaev.dto.RouteResponseDto;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.repository.ChargingStationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutePlanningService {

    private final RouteService routeService;
    private final VehicleRepository vehicleRepository;
    private final ChargingStationRepository stationRepository;
    private final BatterySimulationService batterySimulationService;

    public RoutePlanResult planRoute(Long vehicleId, double startLon, double startLat, double endLon, double endLat, double temperature) {

        // 1. Pobierz pojazd i sprawdź baterię oraz zasięg z uwzględnieniem pogody
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono pojazdu"));

        double consumption = batterySimulationService.getConsumption(vehicle, temperature);
        double currentEnergy = (vehicle.getStateOfCharge() / 100.0) * vehicle.getBatteryCapacityKWh();
        double currentRangeKm = currentEnergy / consumption;

        // 2. Sprawdź bazową trasę A -> B
        RouteResponseDto.Route directRoute = routeService.getRoute(startLon, startLat, endLon, endLat);
        double totalDistanceKm = directRoute.getDistance() / 1000.0;

        RoutePlanResult result = new RoutePlanResult();
        result.setAssignedVehicleId(vehicle.getId());
        result.setVehicleRegistrationNumber(vehicle.getRegistrationNumber());
        result.setReturnBaseName(vehicle.getCurrentBase());
        result.setTemperatureC(temperature);
        result.setConsumptionKWhPerKm(consumption);
        result.setTotalDistanceKm(totalDistanceKm);
        result.setCurrentRangeKm(currentRangeKm);

        // 3. Jeśli auto dojedzie bez problemu
        if (currentRangeKm >= totalDistanceKm) {
            result.setRequiresChargingStop(false);
            result.setRouteCoordinates(directRoute.getGeometry().getCoordinates());
            return result;
        }

        // 4. Jeśli zasięgu ZABRAKNIE -> Szukamy stacji po drodze i modyfikujemy trasę!
        result.setRequiresChargingStop(true);

        // Znajdujemy stację ładowania w pobliżu punktu startowego (lub na dotychczasowym zasięgu)
        List<com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation> nearbyStations =
                stationRepository.findStationsWithinRadius(startLat, startLon, currentRangeKm * 1000 * 0.7);

        if (nearbyStations.isEmpty()) {
            throw new RuntimeException("Brak dostępnych stacji ładowania w zasięgu pojazdu!");
        }

        // Wybieramy pierwszą wolną stację jako nasz przystanek (Waypoint)
        com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation chosenStation = nearbyStations.stream()
                .filter(s -> s.getIsAvailable() != null && s.getIsAvailable())
                .findFirst()
                .orElse(nearbyStations.get(0));

        double stationLon = chosenStation.getLocation().getX();
        double stationLat = chosenStation.getLocation().getY();

        // 5. OSRM z przystankiem pośrednim: Start -> Stacja Ładowania -> Cel
        // Format OSRM dla wielu punktów: /route/v1/driving/lon1,lat1;lon2,lat2;lon3,lat3
        RouteResponseDto.Route routedWithStop = routeService.getRouteWithWaypoint(
                startLon, startLat, stationLon, stationLat, endLon, endLat
        );

        result.setRouteCoordinates(routedWithStop.getGeometry().getCoordinates());
        result.setTotalDistanceKm(routedWithStop.getDistance() / 1000.0);
        result.setTotalDurationMinutes(routedWithStop.getDuration() / 60.0);

        ChargingStationDto stationDto = new ChargingStationDto();
        stationDto.setId(chosenStation.getId());
        stationDto.setName(chosenStation.getName());
        stationDto.setPowerKW(chosenStation.getPowerKW());
        stationDto.setLongitude(stationLon);
        stationDto.setLatitude(stationLat);

        result.setSelectedChargingStation(stationDto);

        // Czas postoju: brakująca energia z rezerwą na dojazd, przy mocy wybranej stacji
        double reserveKWh = BatterySimulationService.RESERVE_AFTER_CHARGING_STOP_PERCENT / 100.0 * vehicle.getBatteryCapacityKWh();
        double energyToChargeKWh = Math.max(0, result.getEnergyRequiredKWh() - currentEnergy + reserveKWh);
        double stationPowerKW = chosenStation.getPowerKW() != null && chosenStation.getPowerKW() > 0
                ? chosenStation.getPowerKW() : BatterySimulationService.DEFAULT_CHARGER_POWER_KW;
        result.setChargingStopMinutes(energyToChargeKWh / (stationPowerKW * BatterySimulationService.CHARGING_EFFICIENCY) * 60);

        return result;
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
        private ChargingStationDto selectedChargingStation;
        private double temperatureC;
        private double consumptionKWhPerKm;
        private Double chargingStopMinutes;

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