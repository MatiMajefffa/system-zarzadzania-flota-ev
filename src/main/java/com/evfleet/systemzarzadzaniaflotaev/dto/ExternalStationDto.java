package com.evfleet.systemzarzadzaniaflotaev.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExternalStationDto {
    private String externalId;
    private String name;
    private Double powerKW;
    private Boolean isAvailable;
    private Double latitude;
    private Double longitude;
}