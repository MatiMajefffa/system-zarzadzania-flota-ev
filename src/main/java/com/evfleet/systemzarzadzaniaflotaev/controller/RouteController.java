package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.RouteHistoryDto;
import com.evfleet.systemzarzadzaniaflotaev.model.DriverNotification;
import com.evfleet.systemzarzadzaniaflotaev.model.Report;
import com.evfleet.systemzarzadzaniaflotaev.model.Role;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteChargingStop;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import com.evfleet.systemzarzadzaniaflotaev.model.User;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;
import com.evfleet.systemzarzadzaniaflotaev.repository.DriverNotificationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.ReportRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.RouteEntityRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.UserRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import com.evfleet.systemzarzadzaniaflotaev.security.SecurityUtils;
import com.evfleet.systemzarzadzaniaflotaev.service.BatterySimulationService;
import com.evfleet.systemzarzadzaniaflotaev.service.RoutePlanningService;
import com.evfleet.systemzarzadzaniaflotaev.service.RouteTrackingService;
import com.evfleet.systemzarzadzaniaflotaev.service.WeatherService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RoutePlanningService routePlanningService;
    private final VehicleRepository vehicleRepository; // Repozytorium do wyszukiwania auta
    private final RouteEntityRepository routeEntityRepository; // Repozytorium do zapisu trwałych tras
    private final DriverNotificationRepository driverNotificationRepository;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final WeatherService weatherService;
    private final RouteTrackingService routeTrackingService;
    private final BatterySimulationService batterySimulationService;

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
        private Double startLat;
        private Double startLng;
        private Double endLat;
        private Double endLng;
        private List<RouteChargingStop> chargingStops;
    }

    // 1. Stary endpoint (po konkretnym ID pojazdu)
    @GetMapping("/plan")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> planRouteAuto(
            @RequestParam double startLon,
            @RequestParam double startLat,
            @RequestParam double endLon,
            @RequestParam double endLat,
            @RequestParam(required = false) String baseName,
            @RequestParam(required = false) VehicleType vehicleType,
            @RequestParam(required = false) Double temperature) {

        // Pobieramy wszystkie pojazdy i szukamy pasującego
        List<Vehicle> vehicles = vehicleRepository.findAll();

        Vehicle selectedVehicle = vehicles.stream()
                .filter(v -> baseName == null || normalizeBaseName(baseName).equals(normalizeBaseName(v.getCurrentBase())))
                .filter(v -> vehicleType == null || vehicleType.equals(v.getVehicleType()))
                .filter(RouteController::isAvailable)
                .findFirst()
                .orElse(null);

        if (selectedVehicle == null) {
            return ResponseEntity.badRequest().body("Brak dostępnych pojazdów spełniających kryteria.");
        }

        // Wywołujemy właściwe planowanie trasy dla znalezionego pojazdu
        RoutePlanningService.RoutePlanResult result = routePlanningService.planRoute(
                selectedVehicle.getId(), startLon, startLat, endLon, endLat,
                temperature != null ? temperature : weatherService.getCurrentTemperature(startLat, startLon)
        );

        return ResponseEntity.ok(result);
    }

    // 3. NOWY endpoint: Przypisanie i zapisanie trasy dla konkretnego kierowcy
    @PostMapping("/assign-to-driver")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional
    public ResponseEntity<?> assignRouteToDriver(@RequestBody AssignRouteRequest request) {
        if (request.getEmployeeId() == null || request.getEmployeeId().isEmpty()) {
            return ResponseEntity.badRequest().body("Brak ID kierowcy w żądaniu.");
        }
        if (!isDriver(request.getEmployeeId())) {
            return ResponseEntity.badRequest().body("Wybrany użytkownik nie jest kierowcą.");
        }
        if (!StringUtils.hasText(request.getStartAddress()) || !StringUtils.hasText(request.getEndAddress())) {
            return ResponseEntity.badRequest().body("Brak adresu startowego lub docelowego trasy.");
        }
        // Panel kierowcy pokazuje tylko najnowszą trasę, więc starsze zlecenie byłoby dla niego niewidoczne
        if (routeEntityRepository.existsByEmployeeIdAndStatusIn(request.getEmployeeId(), RouteEntity.ACTIVE_STATUSES)) {
            return ResponseEntity.badRequest().body("Ten kierowca ma już aktywne zlecenie.");
        }

        Vehicle vehicle = request.getVehicleId() == null ? null
                : vehicleRepository.findByIdForUpdate(request.getVehicleId()).filter(RouteController::isAvailable).orElse(null);
        if (vehicle == null) {
            return ResponseEntity.badRequest().body("Wybrany pojazd nie istnieje lub nie jest już dostępny.");
        }
        vehicle.setStatus(VehicleStatus.W_TRASIE);
        vehicleRepository.save(vehicle);

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
        route.setStartLat(request.getStartLat());
        route.setStartLng(request.getStartLng());
        route.setEndLat(request.getEndLat());
        route.setEndLng(request.getEndLng());
        if (request.getChargingStops() != null) {
            route.setChargingStops(request.getChargingStops());
        }
        route.setStatus(RouteEntity.STATUS_ASSIGNED);

        routeEntityRepository.save(route);

        DriverNotification notification = new DriverNotification();
        notification.setEmployeeId(route.getEmployeeId());
        notification.setRouteId(route.getId());
        notification.setVehicleRegistration(route.getVehicleRegistrationNumber());
        notification.setDescription("Zlecono Ci nową trasę: " + route.getStartAddress() + " → " + route.getEndAddress());
        driverNotificationRepository.save(notification);

        return ResponseEntity.ok("Trasa została pomyślnie zlecona kierowcy.");
    }

    // Lista zleceń, które trzymają rezerwację pojazdu (panel menedżera)
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<RouteEntity>> getActiveRoutes() {
        return ResponseEntity.ok(routeEntityRepository.findByStatusInOrderByIdDesc(RouteEntity.ACTIVE_STATUSES));
    }

    // Symulowane pozycje kierowców w trasie (panel menedżera)
    @GetMapping("/positions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<RouteTrackingService.SimulatedPosition>> getDriverPositions() {
        LocalDateTime now = LocalDateTime.now();
        return ResponseEntity.ok(routeEntityRepository.findByStatusInOrderByIdDesc(List.of(RouteEntity.STATUS_IN_PROGRESS)).stream()
                .flatMap(route -> routeTrackingService.getPosition(route, now).stream())
                .toList());
    }

    // Trasa i symulowana pozycja dla panelu kierowcy
    @GetMapping("/{id}/tracking")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RouteTrackingService.RouteTracking> getRouteTracking(@PathVariable Long id) {
        return findOwnRoute(id)
                .filter(route -> RouteEntity.STATUS_IN_PROGRESS.equals(route.getStatus()))
                .flatMap(route -> routeTrackingService.getTracking(route, LocalDateTime.now()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public record StartRouteRequest(Double latitude, Double longitude) {
    }

    // Kierowca odebrał pojazd i rozpoczyna zleconą trasę
    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('DRIVER')")
    @Transactional
    public ResponseEntity<?> startRoute(@PathVariable Long id, @RequestBody(required = false) StartRouteRequest request) {
        RouteEntity route = findOwnRoute(id).orElse(null);
        if (route == null) {
            return ResponseEntity.notFound().build();
        }
        if (!RouteEntity.STATUS_ASSIGNED.equals(route.getStatus())) {
            return ResponseEntity.status(409).body("Tej trasy nie można już rozpocząć.");
        }

        Vehicle vehicle = vehicleRepository.findByIdForUpdate(route.getVehicleId()).orElse(null);
        if (vehicle == null || Boolean.TRUE.equals(vehicle.getIsBlocked())) {
            return ResponseEntity.status(409).body("Przypisany pojazd jest niedostępny. Skontaktuj się z menedżerem.");
        }
        vehicle.setStatus(VehicleStatus.W_TRASIE);
        vehicleRepository.save(vehicle);

        routeTrackingService.recordOutboundPath(route, request != null ? request.latitude() : null, request != null ? request.longitude() : null);
        route.setStatus(RouteEntity.STATUS_IN_PROGRESS);
        route.setStartedAt(LocalDateTime.now());
        notifyManagers(route, "Rozpoczęto trasę " + describeRoute(route));
        return ResponseEntity.ok(routeEntityRepository.save(route));
    }

    // Kierowca dojechał do celu - tu kończy się mierzony czas przejazdu
    @PostMapping("/{id}/arrive")
    @PreAuthorize("hasRole('DRIVER')")
    @Transactional
    public ResponseEntity<?> arriveAtDestination(@PathVariable Long id) {
        RouteEntity route = findOwnRoute(id).orElse(null);
        if (route == null) {
            return ResponseEntity.notFound().build();
        }
        if (!RouteEntity.STATUS_IN_PROGRESS.equals(route.getStatus()) || route.getArrivedAt() != null) {
            return ResponseEntity.status(409).body("Nie można zgłosić dojazdu dla tej trasy.");
        }

        double temperature = weatherService.getCurrentTemperature(route.getEndLat(), route.getEndLng());
        double chargedKWh = route.getChargingStops().stream().mapToDouble(RouteChargingStop::getChargeKWh).sum();
        vehicleRepository.findByIdForUpdate(route.getVehicleId()).ifPresent(vehicle -> {
            batterySimulationService.applyDrive(vehicle, route.getDistanceKm(), temperature, chargedKWh);
            vehicleRepository.save(vehicle);
        });

        routeTrackingService.recordReturnPath(route);
        route.setArrivedAt(LocalDateTime.now());
        notifyManagers(route, "Dotarcie do celu na trasie " + describeRoute(route));
        return ResponseEntity.ok(routeEntityRepository.save(route));
    }

    // Ostatnie zakończone trasy zalogowanego kierowcy
    @GetMapping("/history")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<RouteHistoryDto>> getRouteHistory() {
        String employeeId = String.valueOf(SecurityUtils.getCurrentUserId());
        List<RouteHistoryDto> history = routeEntityRepository
                .findTop10ByEmployeeIdAndStatusOrderByIdDesc(employeeId, RouteEntity.STATUS_FINISHED).stream()
                .map(route -> new RouteHistoryDto(route.getId(), route.getStartAddress(), route.getEndAddress(), route.getDrivingMinutes()))
                .toList();
        return ResponseEntity.ok(history);
    }

    // Kierowca zwrócił pojazd do bazy - zakończenie trasy zwalnia rezerwację
    @PostMapping("/{id}/finish")
    @PreAuthorize("hasRole('DRIVER')")
    @Transactional
    public ResponseEntity<?> finishRoute(@PathVariable Long id) {
        RouteEntity route = findOwnRoute(id).orElse(null);
        if (route == null) {
            return ResponseEntity.notFound().build();
        }
        if (!RouteEntity.STATUS_IN_PROGRESS.equals(route.getStatus())) {
            return ResponseEntity.status(409).body("Tej trasy nie można zakończyć.");
        }
        if (route.getArrivedAt() == null) {
            return ResponseEntity.status(409).body("Najpierw zgłoś dojazd do celu.");
        }

        // Powrót do bazy liczony jako ten sam dystans co trasa
        double temperature = weatherService.getCurrentTemperature(route.getStartLat(), route.getStartLng());
        vehicleRepository.findByIdForUpdate(route.getVehicleId()).ifPresent(vehicle -> {
            batterySimulationService.applyDrive(vehicle, route.getDistanceKm(), temperature, 0);
            if (StringUtils.hasText(route.getReturnBaseName())) {
                vehicle.setCurrentBase(route.getReturnBaseName());
            }
            if (vehicle.getStateOfCharge() < BatterySimulationService.AUTO_CHARGE_THRESHOLD_PERCENT) {
                batterySimulationService.startCharging(vehicle);
            } else {
                vehicle.setStatus(VehicleStatus.DOSTEPNY);
            }
            vehicleRepository.save(vehicle);
        });

        route.setStatus(RouteEntity.STATUS_FINISHED);
        notifyManagers(route, "Pojazd wrócił do bazy " + route.getReturnBaseName() + " po trasie " + describeRoute(route));
        return ResponseEntity.ok(routeEntityRepository.save(route));
    }

    private static String describeRoute(RouteEntity route) {
        return route.getStartAddress() + " → " + route.getEndAddress();
    }

    // Powiadomienia menedżera to zgłoszenia, które pokazuje panel "Powiadomienia"
    private void notifyManagers(RouteEntity route, String event) {
        User driver = SecurityUtils.getCurrentUser();
        String driverName = driver.getFirstName() + " " + driver.getLastName() + " (ID: " + driver.getId() + ")";
        reportRepository.save(Report.builder()
                .description(event + ". Kierowca: " + driverName)
                .type(Report.TYPE_ROUTE_STATUS)
                .employeeId(route.getEmployeeId())
                .vehicleRegistration(route.getVehicleRegistrationNumber())
                .build());
    }

    // Menedżer anuluje zlecenie, którego kierowca jeszcze nie rozpoczął
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional
    public ResponseEntity<?> cancelRoute(@PathVariable Long id) {
        RouteEntity route = routeEntityRepository.findById(id).orElse(null);
        if (route == null) {
            return ResponseEntity.notFound().build();
        }
        if (!RouteEntity.STATUS_ASSIGNED.equals(route.getStatus())) {
            return ResponseEntity.status(409).body("Można anulować tylko trasę, której kierowca jeszcze nie rozpoczął.");
        }

        vehicleRepository.findByIdForUpdate(route.getVehicleId()).ifPresent(vehicle -> {
            vehicle.setStatus(VehicleStatus.DOSTEPNY);
            vehicleRepository.save(vehicle);
        });
        route.setStatus(RouteEntity.STATUS_CANCELLED);
        routeEntityRepository.save(route);

        DriverNotification notification = new DriverNotification();
        notification.setEmployeeId(route.getEmployeeId());
        notification.setRouteId(route.getId());
        notification.setVehicleRegistration(route.getVehicleRegistrationNumber());
        notification.setType("ANULOWANIE_TRASY");
        notification.setDescription("Anulowano zleconą trasę: " + route.getStartAddress() + " → " + route.getEndAddress());
        driverNotificationRepository.save(notification);

        return ResponseEntity.ok(route);
    }

    private Optional<RouteEntity> findOwnRoute(Long id) {
        String currentEmployeeId = String.valueOf(SecurityUtils.getCurrentUserId());
        return routeEntityRepository.findById(id).filter(route -> currentEmployeeId.equals(route.getEmployeeId()));
    }

    private static boolean isAvailable(Vehicle vehicle) {
        return vehicle.getStatus() == VehicleStatus.DOSTEPNY
                && (vehicle.getIsBlocked() == null || !vehicle.getIsBlocked());
    }

    // Pojazdy mają zapisane bazy zarówno jako "Gliwice", jak i "Baza Gliwice"
    private static String normalizeBaseName(String name) {
        if (name == null) {
            return "";
        }
        String normalized = name.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("baza ") ? normalized.substring("baza ".length()).trim() : normalized;
    }

    private boolean isDriver(String employeeId) {
        try {
            return userRepository.findById(Long.valueOf(employeeId))
                    .filter(user -> user.getRole() == Role.DRIVER)
                    .isPresent();
        } catch (NumberFormatException e) {
            return false;
        }
    }

    // 4. NOWY endpoint: Pobranie ostatniej trasy dla zalogowanego kierowcy
    @GetMapping("/last")
    public ResponseEntity<?> getLastRouteForDriver(@RequestParam String employeeId) {
        User currentUser = SecurityUtils.getCurrentUser();
        if (currentUser.getRole() == Role.DRIVER && !String.valueOf(currentUser.getId()).equals(employeeId)) {
            return ResponseEntity.status(403).body("Brak dostępu do tras innego kierowcy.");
        }

        Optional<RouteEntity> routeOpt = routeEntityRepository.findTopByEmployeeIdOrderByIdDesc(employeeId);
        if (routeOpt.isPresent()) {
            return ResponseEntity.ok(routeOpt.get());
        }
        return ResponseEntity.status(404).body("Brak przypisanych tras.");
    }
}