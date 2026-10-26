package com.evfleet.systemzarzadzaniaflotaev.model;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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
    @Column(nullable = false)
    private VehicleStatus status;
}
