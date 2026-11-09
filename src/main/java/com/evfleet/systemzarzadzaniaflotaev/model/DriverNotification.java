package com.evfleet.systemzarzadzaniaflotaev.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "driver_notifications")
@Getter
@Setter
public class DriverNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ID kierowcy, do którego skierowane jest powiadomienie
    @Column(nullable = false)
    private String employeeId;

    // Zlecona trasa, której dotyczy powiadomienie
    private Long routeId;

    @Column(nullable = false, length = 1000)
    private String description;

    private String type = "ZLECENIE_TRASY";
    private String vehicleRegistration;
    private String status = "NIEODCZYTANY"; // NIEODCZYTANY, ODCZYTANY
    private LocalDateTime createdAt = LocalDateTime.now();
}