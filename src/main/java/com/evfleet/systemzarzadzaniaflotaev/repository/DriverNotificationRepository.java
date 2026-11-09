package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.DriverNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriverNotificationRepository extends JpaRepository<DriverNotification, Long> {

    List<DriverNotification> findByEmployeeIdOrderByCreatedAtDesc(String employeeId);

    Optional<DriverNotification> findByIdAndEmployeeId(Long id, String employeeId);
}