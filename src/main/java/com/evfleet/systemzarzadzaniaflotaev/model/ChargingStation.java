package com.evfleet.systemzarzadzaniaflotaev.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.locationtech.jts.geom.Point;

@Entity
@Table(name = "charging_stations")
@Getter
@Setter
public class ChargingStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double powerKW;

    @Column(nullable = false)
    private Boolean isAvailable;

    @Column(columnDefinition = "geometry(Point, 4326)", nullable = false)
    private Point location;
}