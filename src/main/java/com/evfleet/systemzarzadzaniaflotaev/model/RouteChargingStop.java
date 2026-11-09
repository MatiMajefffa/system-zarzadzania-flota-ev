package com.evfleet.systemzarzadzaniaflotaev.model;

import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class RouteChargingStop {

    private String name;
    private double latitude;
    private double longitude;
    private double chargeKWh;
    private double chargingMinutes;
}
