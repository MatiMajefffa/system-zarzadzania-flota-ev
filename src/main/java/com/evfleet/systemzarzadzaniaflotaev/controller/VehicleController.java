package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.VehicleDto;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    // Pobieranie wszystkich pojazdów
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<List<VehicleDto>> getAllVehicles() {
        return ResponseEntity.ok(vehicleService.getAllVehicles());
    }

    // Pobieranie pojazdu po ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<VehicleDto> getVehicleById(@PathVariable Long id) {
        return vehicleService.getVehicleById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Pobieranie pojazdów po statusie (np. /api/vehicles/status/AVAILABLE)
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<List<VehicleDto>> getVehiclesByStatus(@PathVariable VehicleStatus status) {
        return ResponseEntity.ok(vehicleService.getVehiclesByStatus(status));
    }

    // Pobieranie pojazdów z niskim stanem baterii (np. /api/vehicles/low-battery?threshold=20)
    @GetMapping("/low-battery")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<List<VehicleDto>> getLowBatteryVehicles(@RequestParam(defaultValue = "20") Integer threshold) {
        return ResponseEntity.ok(vehicleService.getLowBatteryVehicles(threshold));
    }

    // Dodawanie / Zapisywanie pojazdu
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<VehicleDto> saveVehicle(@RequestBody VehicleDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vehicleService.saveVehicle(dto));
    }

    // Usunięcie pojazdu
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteVehicle(@PathVariable Long id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.noContent().build();
    }

    // === NOWE ENDPOINTY ===

    // Blokowanie / Odblokowywanie pojazdu przez menedżera
    @PutMapping("/{id}/block")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<VehicleDto> toggleBlockVehicle(@PathVariable Long id) {
        return ResponseEntity.ok(vehicleService.toggleBlockVehicle(id));
    }

    // Ręczny zwrot pojazdu do bazy; kierowca zwraca pojazd przez zakończenie zleconej trasy
    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<VehicleDto> returnVehicle(@PathVariable Long id, @RequestParam String baseName) {
        return ResponseEntity.ok(vehicleService.returnVehicle(id, baseName));
    }
}