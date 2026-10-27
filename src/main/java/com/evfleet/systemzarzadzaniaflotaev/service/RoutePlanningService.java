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

    public RoutePlanResult planRoute(Long vehicleId, double startLon, double startLat, double endLon, double endLat, double temperature) {

        // 1. Pobierz pojazd i sprawdź baterię oraz zasięg z uwzględnieniem pogody
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono pojazdu"));

        double baseConsumption = 0.18; // kWh/km
        double weatherFactor = (temperature < 0) ? 1.2 : 1.0;
        double currentEnergy = (vehicle.getStateOfCharge() / 100.0) * vehicle.getBatteryCapacityKWh();
        double currentRangeKm = currentEnergy / (baseConsumption * weatherFactor);

        // 2. Sprawdź bazową trasę A -> B
        RouteResponseDto.Route directRoute = routeService.getRoute(startLon, startLat, endLon, endLat);
        double totalDistanceKm = directRoute.getDistance() / 1000.0;

        RoutePlanResult result = new RoutePlanResult();
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

        return result;
    }

    @lombok.Getter @lombok.Setter
    public static class RoutePlanResult {
        private double totalDistanceKm;
        private double totalDurationMinutes;
        private double currentRangeKm;
        private boolean requiresChargingStop;
        private List<List<Double>> routeCoordinates;
        private ChargingStationDto selectedChargingStation;
    }
}