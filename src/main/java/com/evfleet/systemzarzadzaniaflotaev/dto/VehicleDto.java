package com.evfleet.systemzarzadzaniaflotaev.dto;

import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VehicleDto {
    private Long id;
    private String registrationNumber;
    private String model;
    private Double batteryCapacityKWh;
    private Integer stateOfCharge;
    private VehicleStatus status;
}
