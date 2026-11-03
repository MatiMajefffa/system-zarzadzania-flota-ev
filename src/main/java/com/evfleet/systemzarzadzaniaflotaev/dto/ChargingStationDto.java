package com.evfleet.systemzarzadzaniaflotaev.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChargingStationDto {
    private Long id;

    @NotBlank(message = "Nazwa stacji jest wymagana")
    private String name;

    @NotNull(message = "Moc ładowarki jest wymagana")
    @Positive(message = "Moc ładowarki musi być większa od zera")
    private Double powerKW;

    private Boolean isAvailable;

    @NotNull(message = "Szerokość geograficzna jest wymagana")
    private Double latitude;

    @NotNull(message = "Długość geograficzna jest wymagana")
    private Double longitude;
}