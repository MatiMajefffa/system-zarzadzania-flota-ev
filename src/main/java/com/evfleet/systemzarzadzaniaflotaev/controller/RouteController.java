package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;
import com.evfleet.systemzarzadzaniaflotaev.repository.RouteEntityRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import com.evfleet.systemzarzadzaniaflotaev.service.RoutePlanningService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RoutePlanningService routePlanningService;
    private final VehicleRepository vehicleRepository; // Repozytorium do wyszukiwania auta
    private final RouteEntityRepository routeEntityRepository; // Repozytorium do zapisu trwałych tras

    // Klasa DTO do żądania przypisania trasy kierowcy
    @Getter
    @Setter
    public static class AssignRouteRequest {
        private String employeeId;
        private Long vehicleId;
        private String vehicleRegistrationNumber;
        private String startAddress;
        private String endAddress;
        private Double distanceKm;
        private Double energyRequiredKWh;
        private Double vehicleRangeKm;
        private String returnBaseName;
    }

    // 1. Stary endpoint (po konkretnym ID pojazdu)
    @GetMapping("/plan")
    public ResponseEntity<RoutePlanningService.RoutePlanResult> planRoute(
            @RequestParam Long vehicleId,
            @RequestParam double startLon,
            @RequestParam double startLat,
            @RequestParam double endLon,
            @RequestParam double endLat,
            @RequestParam(defaultValue = "15.0") double temperature) {

        RoutePlanningService.RoutePlanResult result = routePlanningService.planRoute(
                vehicleId, startLon, startLat, endLon, endLat, temperature
        );
        return ResponseEntity.ok(result);
    }

    // 2. NOWY endpoint: automatyczny dobór pojazdu na podstawie bazy i typu ładunku
    @GetMapping("/plan-auto")
    public ResponseEntity<?> planRouteAuto(
            @RequestParam double startLon,
            @RequestParam double startLat,
            @RequestParam double endLon,
            @RequestParam double endLat,
            @RequestParam(required = false) String baseName,
            @RequestParam(required = false) VehicleType vehicleType,
            @RequestParam(defaultValue = "15.0") double temperature) {

        // Pobieramy wszystkie pojazdy i szukamy pasującego
        List<Vehicle> vehicles = vehicleRepository.findAll();

        Vehicle selectedVehicle = vehicles.stream()
                .filter(v -> baseName == null || baseName.equalsIgnoreCase(v.getCurrentBase()))
                .filter(v -> vehicleType == null || vehicleType.equals(v.getVehicleType()))
                .filter(v -> v.getStatus() == VehicleStatus.DOSTEPNY && (v.getIsBlocked() == null || !v.getIsBlocked()))
                .findFirst()
                .orElse(null);

        // Fallback: jeśli nie ma dokładnie w tej bazie/typie, weź pierwszy wolny pojazd
        if (selectedVehicle == null) {
            selectedVehicle = vehicles.stream()
                    .filter(v -> v.getStatus() == VehicleStatus.DOSTEPNY && (v.getIsBlocked() == null || !v.getIsBlocked()))
                    .findFirst()
                    .orElse(null);
        }

        if (selectedVehicle == null) {
            return ResponseEntity.badRequest().body("Brak dostępnych pojazdów spełniających kryteria.");
        }

        // Wywołujemy właściwe planowanie trasy dla znalezionego pojazdu
        RoutePlanningService.RoutePlanResult result = routePlanningService.planRoute(
                selectedVehicle.getId(), startLon, startLat, endLon, endLat, temperature
        );

        return ResponseEntity.ok(result);
    }

    // 3. NOWY endpoint: Przypisanie i zapisanie trasy dla konkretnego kierowcy
    @PostMapping("/assign-to-driver")
    public ResponseEntity<?> assignRouteToDriver(@RequestBody AssignRouteRequest request) {
        if (request.getEmployeeId() == null || request.getEmployeeId().isEmpty()) {
            return ResponseEntity.badRequest().body("Brak ID kierowcy w żądaniu.");
        }

        RouteEntity route = new RouteEntity();
        route.setEmployeeId(request.getEmployeeId());
        route.setVehicleId(request.getVehicleId());
        route.setVehicleRegistrationNumber(request.getVehicleRegistrationNumber());
        route.setStartAddress(request.getStartAddress());
        route.setEndAddress(request.getEndAddress());
        route.setDistanceKm(request.getDistanceKm());
        route.setEnergyRequiredKWh(request.getEnergyRequiredKWh());
        route.setVehicleRangeKm(request.getVehicleRangeKm());
        route.setReturnBaseName(request.getReturnBaseName());
        route.setStatus("ZLECONA");

        routeEntityRepository.save(route);
        return ResponseEntity.ok("Trasa została pomyślnie zlecona kierowcy.");
    }

    // 4. NOWY endpoint: Pobranie ostatniej trasy dla zalogowanego kierowcy
    @GetMapping("/last")
    public ResponseEntity<?> getLastRouteForDriver(@RequestParam String employeeId) {
        Optional<RouteEntity> routeOpt = routeEntityRepository.findTopByEmployeeIdOrderByIdDesc(employeeId);
        if (routeOpt.isPresent()) {
            return ResponseEntity.ok(routeOpt.get());
        }
        return ResponseEntity.status(404).body("Brak przypisanych tras.");
    }
}