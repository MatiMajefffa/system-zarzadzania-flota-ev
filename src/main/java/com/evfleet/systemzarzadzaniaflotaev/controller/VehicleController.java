package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.VehicleDto;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    public List<VehicleDto> getAllVehicles() {
        return vehicleService.getAllVehicles();
    }

    @GetMapping("/{id}")
    public ResponseEntity<VehicleDto> getVehicleById(@PathVariable Long id) {
        return vehicleService.getVehicleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET: Filtrowanie pojazdów po statusie (np. /api/vehicles/status/DOSTEPNY)
    @GetMapping("/status/{status}")
    public List<VehicleDto> getVehiclesByStatus(@PathVariable VehicleStatus status) {
        return vehicleService.getVehiclesByStatus(status);
    }

    // GET: Pobieranie pojazdów z niskim stanem baterii (np. /api/vehicles/low-battery?threshold=20)
    @GetMapping("/low-battery")
    public List<VehicleDto> getLowBatteryVehicles(@RequestParam(defaultValue = "20") Integer threshold) {
        return vehicleService.getLowBatteryVehicles(threshold);
    }

    @PostMapping
    public ResponseEntity<VehicleDto> createVehicle(@Valid @RequestBody VehicleDto vehicleDto) {
        VehicleDto savedVehicle = vehicleService.saveVehicle(vehicleDto);
        return ResponseEntity.ok(savedVehicle);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVehicle(@PathVariable Long id) {
        if (vehicleService.getVehicleById(id).isPresent()) {
            vehicleService.deleteVehicle(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}