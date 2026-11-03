package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.VehicleDto;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    // Przegląd całej floty - tylko dla Menedżera i wyżej
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public List<VehicleDto> getAllVehicles() {
        return vehicleService.getAllVehicles();
    }

    // Szczegóły pojedynczego pojazdu - dostępne także dla Kierowcy
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<VehicleDto> getVehicleById(@PathVariable Long id) {
        return vehicleService.getVehicleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Widok statystyk (po statusie) - tylko dla Menedżera
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('MANAGER')")
    public List<VehicleDto> getVehiclesByStatus(@PathVariable VehicleStatus status) {
        return vehicleService.getVehiclesByStatus(status);
    }

    // Widok statystyk (niska bateria) - tylko dla Menedżera
    @GetMapping("/low-battery")
    @PreAuthorize("hasRole('MANAGER')")
    public List<VehicleDto> getLowBatteryVehicles(@RequestParam(defaultValue = "20") Integer threshold) {
        return vehicleService.getLowBatteryVehicles(threshold);
    }

    // Dodawanie pojazdu - tylko dla Menedżera
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<VehicleDto> createVehicle(@Valid @RequestBody VehicleDto vehicleDto) {
        VehicleDto savedVehicle = vehicleService.saveVehicle(vehicleDto);
        return ResponseEntity.ok(savedVehicle);
    }

    // Usuwanie pojazdu - tylko dla Menedżera
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> deleteVehicle(@PathVariable Long id) {
        if (vehicleService.getVehicleById(id).isPresent()) {
            vehicleService.deleteVehicle(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}