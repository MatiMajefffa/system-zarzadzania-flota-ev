package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    // Wyszukiwanie zgłoszeń dla konkretnego auta
    List<Report> findByVehicleRegistration(String vehicleRegistration);

    // Pobieranie wszystkich zgłoszeń posortowanych od najnowszego do najstarszego
    List<Report> findAllByOrderByCreatedAtDesc();

    List<Report> findByEmployeeIdOrderByCreatedAtDesc(String employeeId);

    Optional<Report> findByIdAndEmployeeId(Long id, String employeeId);
}
