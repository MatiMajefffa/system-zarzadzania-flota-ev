package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.RouteResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Locale;

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
     * Wyznacza trasę z punktem pośrednim (przystankiem na stacji ładowania): Start -> Stacja -> Cel
     */
    public RouteResponseDto.Route getRouteWithWaypoint(double startLon, double startLat, double stationLon, double stationLat, double endLon, double endLat) {
        String url = String.format(Locale.US, "%s/route/v1/driving/%.6f,%.6f;%.6f,%.6f;%.6f,%.6f?geometries=geojson&overview=full",
                OSRM_URL, startLon, startLat, stationLon, stationLat, endLon, endLat);

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