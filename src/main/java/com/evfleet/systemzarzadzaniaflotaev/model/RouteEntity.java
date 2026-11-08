package com.evfleet.systemzarzadzaniaflotaev.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "assigned_routes")
@Getter
@Setter
public class RouteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String employeeId;     // ID kierowcy, któremu zlecono trasę
    private Long vehicleId;        // ID przypisanego pojazdu
    private String vehicleRegistrationNumber;

    private String startAddress;
    private String endAddress;
    private Double distanceKm;
    private Double energyRequiredKWh;
    private Double vehicleRangeKm;
    private String returnBaseName;

    private String status = "ZLECONA"; // ZLECONA, W_TRAKCIE, ZAKONCZONA
    private LocalDateTime createdAt = LocalDateTime.now();
}