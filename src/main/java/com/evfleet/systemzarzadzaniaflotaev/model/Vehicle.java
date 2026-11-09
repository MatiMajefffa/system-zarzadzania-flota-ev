package com.evfleet.systemzarzadzaniaflotaev.model;

import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String registrationNumber;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private Double batteryCapacityKWh;

    @Column(nullable = false)
    private Integer stateOfCharge;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type")
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleStatus status;

    // === NOWE POLA DLA ZARZĄDZANIA TRASAMI I FLOTĄ ===

    @Column(name = "is_blocked")
    private Boolean isBlocked = false; // Czy pojazd jest zablokowany przez menedżera

    @Column(name = "total_mileage")
    private Double totalMileage = 0.0; // Przebieg całkowity pojazdu

    @Column(name = "current_base")
    private String currentBase = "Baza Katowice"; // Miejsce, w którym aktualnie znajduje się pojazd

    // Symulacja ładowania (puste, gdy pojazd się nie ładuje)
    private Integer chargingStartSoc;
    private LocalDateTime chargingStartedAt;
    private LocalDateTime chargingEndsAt;
}