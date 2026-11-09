package com.evfleet.systemzarzadzaniaflotaev.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assigned_routes")
@Getter
@Setter
public class RouteEntity {

    public static final String STATUS_ASSIGNED = "ZLECONA";
    public static final String STATUS_IN_PROGRESS = "W_TRAKCIE";
    public static final String STATUS_FINISHED = "ZAKONCZONA";
    public static final String STATUS_CANCELLED = "ANULOWANA";
    // Trasy w tych statusach trzymają rezerwację pojazdu
    public static final List<String> ACTIVE_STATUSES = List.of(STATUS_ASSIGNED, STATUS_IN_PROGRESS);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String employeeId;     // ID kierowcy, któremu zlecono trasę
    private Long vehicleId;        // ID przypisanego pojazdu
    private String vehicleRegistrationNumber;

    private String startAddress;
    private String endAddress;
    private Double distanceKm;
    private Double energyRequiredKWh;
    private Double vehicleRangeKm;
    private String returnBaseName;

    // Współrzędne potrzebne do odtworzenia trasy na mapie kierowcy
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "route_charging_stops", joinColumns = @JoinColumn(name = "route_id"))
    @OrderColumn(name = "stop_order")
    private List<RouteChargingStop> chargingStops = new ArrayList<>();

    private String status = STATUS_ASSIGNED;
    private LocalDateTime createdAt = LocalDateTime.now();

    // Przebieg trasy "dł,szer;dł,szer" i planowany czas jazdy, używane do symulacji pozycji
    @JsonIgnore
    @Column(columnDefinition = "text")
    private String pathGeometry;
    private Double plannedDurationSeconds;

    private LocalDateTime startedAt; // Odbiór pojazdu
    private LocalDateTime arrivedAt; // Dojazd do celu
}