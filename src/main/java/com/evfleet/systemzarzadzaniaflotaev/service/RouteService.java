package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.RouteResponseDto;
import com.evfleet.systemzarzadzaniaflotaev.exception.RouteNotFeasibleException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class RouteService {

    private final RestClient restClient = RestClient.create();
    private final String OSRM_URL = "http://localhost:5000";
    private static final double MAX_DISTANCE_FROM_ROAD_METERS = 2000;

    /**
     * Wyznacza bazową trasę między punktem początkowym a końcowym przez OSRM
     */
    public RouteResponseDto.Route getRoute(double startLon, double startLat, double endLon, double endLat) {
        String url = String.format(Locale.US, "%s/route/v1/driving/%.6f,%.6f;%.6f,%.6f?geometries=geojson&overview=full",
                OSRM_URL, startLon, startLat, endLon, endLat);

        try {
            RouteResponseDto response = restClient.get()
                    .uri(url)
                    .header("Accept-Encoding", "identity") // Wyłącza oczekiwanie na skompresowany plik zip/gzip
                    .retrieve()
                    .body(RouteResponseDto.class);

            if (response != null && response.getRoutes() != null && !response.getRoutes().isEmpty()) {
                ensureInsideServiceArea(response);
                return response.getRoutes().get(0);
            }
            throw new RuntimeException("Nie udało się wyznaczyć trasy.");
        } catch (RouteNotFeasibleException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Błąd komunikacji z serwerem OSRM: " + e.getMessage(), e);
        }
    }

    // Mapa OSRM obejmuje tylko śląskie, więc punkt spoza niej zostaje przesunięty na daleką drogę
    private void ensureInsideServiceArea(RouteResponseDto response) {
        boolean outside = response.getWaypoints() != null && response.getWaypoints().stream()
                .anyMatch(waypoint -> waypoint.getDistance() != null && waypoint.getDistance() > MAX_DISTANCE_FROM_ROAD_METERS);
        if (outside) {
            throw new RouteNotFeasibleException("Trasa wychodzi poza obsługiwany obszar. System obsługuje tylko trasy w województwie śląskim.");
        }
    }

    /**
     * Wyznacza trasę przez przystanki ładowania; punkty podawane jako [długość, szerokość]
     */
    public RouteResponseDto.Route getRouteThroughPoints(List<double[]> points) {
        String coordinates = points.stream()
                .map(point -> String.format(Locale.US, "%.6f,%.6f", point[0], point[1]))
                .collect(Collectors.joining(";"));
        String url = String.format("%s/route/v1/driving/%s?geometries=geojson&overview=full", OSRM_URL, coordinates);

        try {
            RouteResponseDto response = restClient.get()
                    .uri(url)
                    .header("Accept-Encoding", "identity") // Wyłącza oczekiwanie na skompresowany plik zip/gzip
                    .retrieve()
                    .body(RouteResponseDto.class);

            if (response != null && response.getRoutes() != null && !response.getRoutes().isEmpty()) {
                return response.getRoutes().get(0);
            }
            throw new RuntimeException("Nie udało się wyznaczyć trasy z przystankiem.");
        } catch (Exception e) {
            throw new RuntimeException("Błąd komunikacji z serwerem OSRM (Waypoint): " + e.getMessage(), e);
        }
    }
}