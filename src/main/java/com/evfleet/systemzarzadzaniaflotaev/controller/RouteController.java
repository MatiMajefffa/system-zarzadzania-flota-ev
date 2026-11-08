package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import com.evfleet.systemzarzadzaniaflotaev.service.RoutePlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RoutePlanningService routePlanningService;
    private final VehicleRepository vehicleRepository; // Dodane repozytorium do wyszukiwania auta

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
}