package com.evfleet.systemzarzadzaniaflotaev.model;

public enum VehicleType {
    OSOBOWY("Przewóz osób / VIP"),
    MALY_DOSTAWCZAK("Przewóz małych paczek"),
    DUZY_DOSTAWCZAK("Przewóz dużych paczek (duża paka)");

    private final String displayName;

    VehicleType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
