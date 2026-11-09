package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.RouteResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class RouteService {

    private final RestClient restClient = RestClient.create();
    private final String OSRM_URL = "http://localhost:5000";

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
                return response.getRoutes().get(0);
            }
            throw new RuntimeException("Nie udało się wyznaczyć trasy.");
        } catch (Exception e) {
            throw new RuntimeException("Błąd komunikacji z serwerem OSRM: " + e.getMessage(), e);
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