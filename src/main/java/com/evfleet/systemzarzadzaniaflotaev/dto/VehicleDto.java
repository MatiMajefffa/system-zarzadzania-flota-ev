package com.evfleet.systemzarzadzaniaflotaev.dto;

import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VehicleDto {

    private Long id;

    @NotBlank(message = "Numer rejestracyjny nie może być pusty")
    private String registrationNumber;

    @NotBlank(message = "Model pojazdu nie może być pusty")
    private String model;

    @NotNull(message = "Pojemność baterii jest wymagana")
    @Positive(message = "Pojemność baterii musi być większa od zera")
    private Double batteryCapacityKWh;

    @NotNull(message = "Stan naładowania (SoC) jest wymagany")
    @Min(value = 0, message = "Stan naładowania nie może być mniejszy niż 0%")
    @Max(value = 100, message = "Stan naładowania nie może być większy niż 100%")
    private Integer stateOfCharge;

    @NotNull(message = "Status pojazdu jest wymagany")
    private VehicleStatus status;
}
