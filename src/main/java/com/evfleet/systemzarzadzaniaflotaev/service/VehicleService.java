package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.VehicleDto;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    // Pobranie wszystkich pojazdów jako DTO
    public List<VehicleDto> getAllVehicles() {
        return vehicleRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Pobranie pojazdu po ID jako DTO
    public Optional<VehicleDto> getVehicleById(Long id) {
        return vehicleRepository.findById(id)
                .map(this::convertToDto);
    }

    // Zapisanie nowego pojazdu na podstawie DTO
    public VehicleDto saveVehicle(VehicleDto vehicleDto) {
        Vehicle vehicle = convertToEntity(vehicleDto);
        Vehicle savedVehicle = vehicleRepository.save(vehicle);
        return convertToDto(savedVehicle);
    }

    // Usunięcie pojazdu
    public void deleteVehicle(Long id) {
        vehicleRepository.deleteById(id);
    }

    // --- Metody pomocnicze do mapowania ---

    private VehicleDto convertToDto(Vehicle vehicle) {
        VehicleDto dto = new VehicleDto();
        dto.setId(vehicle.getId());
        dto.setRegistrationNumber(vehicle.getRegistrationNumber());
        dto.setModel(vehicle.getModel());
        dto.setBatteryCapacityKWh(vehicle.getBatteryCapacityKWh());
        dto.setStateOfCharge(vehicle.getStateOfCharge());
        dto.setStatus(vehicle.getStatus());
        return dto;
    }

    private Vehicle convertToEntity(VehicleDto dto) {
        Vehicle vehicle = new Vehicle();
        vehicle.setId(dto.getId());
        vehicle.setRegistrationNumber(dto.getRegistrationNumber());
        vehicle.setModel(dto.getModel());
        vehicle.setBatteryCapacityKWh(dto.getBatteryCapacityKWh());
        vehicle.setStateOfCharge(dto.getStateOfCharge());
        vehicle.setStatus(dto.getStatus());
        return vehicle;
    }
}