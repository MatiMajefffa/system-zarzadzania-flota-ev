package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.VehicleDetailsDto;
import com.evfleet.systemzarzadzaniaflotaev.dto.VehicleDto;
import com.evfleet.systemzarzadzaniaflotaev.model.Report;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;
import com.evfleet.systemzarzadzaniaflotaev.repository.ReportRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.RouteEntityRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.UserRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final RouteEntityRepository routeRepository;
    private final BatterySimulationService batterySimulationService;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

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
        if (vehicleDto.getId() == null && vehicleRepository.existsByRegistrationNumber(vehicleDto.getRegistrationNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Pojazd o takim numerze rejestracyjnym już istnieje.");
        }

        Vehicle vehicle = convertToEntity(vehicleDto);
        Vehicle savedVehicle = vehicleRepository.save(vehicle);
        return convertToDto(savedVehicle);
    }

    // Usunięcie pojazdu
    public void deleteVehicle(Long id) {
        vehicleRepository.deleteById(id);
    }

    // Pobierz pojazdy filtrowane po statusie
    public List<VehicleDto> getVehiclesByStatus(VehicleStatus status) {
        return vehicleRepository.findByStatus(status).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Pobierz pojazdy z niskim stanem baterii (poniżej zadanego progu)
    public List<VehicleDto> getLowBatteryVehicles(Integer threshold) {
        return vehicleRepository.findByStateOfChargeLessThan(threshold).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // === NOWE METODY DLA CYKLU ŻYCIA TRASY ===

    // Zmienia status zablokowania pojazdu (Menedżer)
    public VehicleDto toggleBlockVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono pojazdu o ID: " + id));

        // Zabezpieczenie przed nullem, jeśli w bazie było puste pole
        boolean currentBlockStatus = vehicle.getIsBlocked() != null ? vehicle.getIsBlocked() : false;
        vehicle.setIsBlocked(!currentBlockStatus);

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);
        return convertToDto(updatedVehicle);
    }

    // Zwraca auto do bazy i ustawia je jako dostępne (Kierowca)
    public VehicleDto returnVehicle(Long id, String baseName) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono pojazdu o ID: " + id));

        // Pojazd zarezerwowany pod zlecenie zwalnia się tylko przez zakończenie lub anulowanie tej trasy
        if (routeRepository.existsByVehicleIdAndStatusIn(id, RouteEntity.ACTIVE_STATUSES)) {
            return convertToDto(vehicle);
        }

        vehicle.setStatus(VehicleStatus.DOSTEPNY);
        vehicle.setCurrentBase(baseName);

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);
        return convertToDto(updatedVehicle);
    }

    // Historia i bieżące informacje o pojeździe (Menedżer)
    @Transactional(readOnly = true)
    public VehicleDetailsDto getVehicleDetails(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono pojazdu."));

        double energyKWh = vehicle.getStateOfCharge() / 100.0 * vehicle.getBatteryCapacityKWh();
        List<VehicleDetailsDto.ReportSummary> reports = reportRepository.findByVehicleRegistration(vehicle.getRegistrationNumber()).stream()
                .filter(report -> !Report.TYPE_ROUTE_STATUS.equals(report.getType()))
                .sorted(Comparator.comparing(Report::getCreatedAt).reversed())
                .limit(5)
                .map(report -> new VehicleDetailsDto.ReportSummary(report.getDescription(), report.getType(),
                        report.getEmployeeId(), report.getStatus(), report.getCreatedAt()))
                .toList();

        return new VehicleDetailsDto(
                vehicle.getVehicleType(),
                energyKWh / batterySimulationService.getBaseConsumption(vehicle.getVehicleType()),
                routeRepository.countByVehicleIdAndStatus(id, RouteEntity.STATUS_FINISHED),
                findRouteSummary(id, List.of(RouteEntity.STATUS_FINISHED)),
                findRouteSummary(id, RouteEntity.ACTIVE_STATUSES),
                reports);
    }

    private VehicleDetailsDto.RouteSummary findRouteSummary(Long vehicleId, List<String> statuses) {
        return routeRepository.findTopByVehicleIdAndStatusInOrderByIdDesc(vehicleId, statuses)
                .map(route -> new VehicleDetailsDto.RouteSummary(route.getStartAddress(), route.getEndAddress(), getDriverName(route.getEmployeeId()),
                        route.getStatus(), route.getDistanceKm(), route.getStartedAt(), route.getDrivingMinutes()))
                .orElse(null);
    }

    private String getDriverName(String employeeId) {
        try {
            return userRepository.findById(Long.valueOf(employeeId))
                    .map(user -> user.getFirstName() != null ? user.getFirstName() + " " + user.getLastName() : user.getEmail())
                    .orElse("ID: " + employeeId);
        } catch (NumberFormatException e) {
            return "ID: " + employeeId;
        }
    }

    // Zmiana typu i statusu przez menedżera; statusy W_TRASIE i LADOWANIE ustawia wyłącznie system
    @Transactional
    public VehicleDto updateVehicleSettings(Long id, VehicleType vehicleType, VehicleStatus status) {
        if (vehicleType == null || (status != VehicleStatus.DOSTEPNY && status != VehicleStatus.SERWIS)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowy typ lub status pojazdu.");
        }

        Vehicle vehicle = vehicleRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono pojazdu."));

        boolean isInUse = (vehicle.getStatus() != VehicleStatus.DOSTEPNY && vehicle.getStatus() != VehicleStatus.SERWIS)
                || routeRepository.existsByVehicleIdAndStatusIn(id, RouteEntity.ACTIVE_STATUSES);
        if (isInUse) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nie można zmienić pojazdu, który jest w trasie lub się ładuje.");
        }

        vehicle.setVehicleType(vehicleType);
        vehicle.setStatus(status);
        return convertToDto(vehicleRepository.save(vehicle));
    }

    // Ręczne uruchomienie ładowania w bazie (Menedżer)
    @Transactional
    public VehicleDto startCharging(Long id) {
        Vehicle vehicle = vehicleRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono pojazdu."));

        if (vehicle.getStatus() != VehicleStatus.DOSTEPNY || vehicle.getStateOfCharge() >= 100) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tego pojazdu nie można teraz ładować.");
        }

        batterySimulationService.startCharging(vehicle);
        return convertToDto(vehicleRepository.save(vehicle));
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

        // Mapowanie nowych pól
        dto.setIsBlocked(vehicle.getIsBlocked());
        dto.setTotalMileage(vehicle.getTotalMileage());
        dto.setCurrentBase(vehicle.getCurrentBase());
        dto.setChargingEndsAt(vehicle.getChargingEndsAt());
        dto.setVehicleType(vehicle.getVehicleType());

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

        // Mapowanie nowych pól
        vehicle.setIsBlocked(dto.getIsBlocked());
        vehicle.setTotalMileage(dto.getTotalMileage());
        vehicle.setCurrentBase(dto.getCurrentBase());
        vehicle.setVehicleType(dto.getVehicleType());

        return vehicle;
    }
}