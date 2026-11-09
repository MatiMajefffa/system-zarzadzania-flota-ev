package com.evfleet.systemzarzadzaniaflotaev.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class RouteResponseDto {
    private List<Route> routes;
    private List<Waypoint> waypoints;

    @Getter
    @Setter
    public static class Waypoint {
        private Double distance; // Odległość punktu od najbliższej drogi na mapie w metrach
    }

    @Getter
    @Setter
    public static class Route {
        private Double distance; // Dystans w metrach
        private Double duration; // Czas w sekundach
        private Geometry geometry;
    }

    @Getter
    @Setter
    public static class Geometry {
        private String type;
        private List<List<Double>> coordinates; // Współrzędne trasy [longitude, latitude]
    }
}