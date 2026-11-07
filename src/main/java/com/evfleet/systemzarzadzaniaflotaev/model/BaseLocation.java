package com.evfleet.systemzarzadzaniaflotaev.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "bases")
@Getter
@Setter
public class BaseLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // np. "Baza Katowice"

    @Column(nullable = false)
    private Double latitude; // Szerokość geograficzna

    @Column(nullable = false)
    private Double longitude; // Długość geograficzna
}