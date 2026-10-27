package com.evfleet.systemzarzadzaniaflotaev.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OcmStationResponse {

    @JsonProperty("AddressInfo")
    private AddressInfo addressInfo;

    @Getter
    @Setter
    public static class AddressInfo {
        private String Title;
        private Double Latitude;
        private Double Longitude;
        private String AddressLine1;
    }
}