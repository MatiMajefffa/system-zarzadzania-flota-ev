package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.ChargingStationDto;
import com.evfleet.systemzarzadzaniaflotaev.service.ChargingStationService;
import com.evfleet.systemzarzadzaniaflotaev.service.ChargingStationSyncService;
import com.evfleet.systemzarzadzaniaflotaev.service.GeocodingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/charging-stations")
@RequiredArgsConstructor
public class ChargingStationController {

    private final ChargingStationService stationService;
    private final ChargingStationSyncService syncService;
    private final GeocodingService geocodingService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<List<ChargingStationDto>> getAllStations() {
        return ResponseEntity.ok(stationService.getAllStations());
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<Integer> syncExternalStations() {
        int savedCount = syncService.fetchAndSaveExternalStations();
        return ResponseEntity.ok(savedCount);
    }

    @GetMapping("/nearby")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<List<ChargingStationDto>> getStationsNearby(
            @RequestParam(name = "latitude", required = false) Double latitude,
            @RequestParam(name = "longitude", required = false) Double longitude,
            @RequestParam(name = "lat", required = false) Double lat,
            @RequestParam(name = "lon", required = false) Double lon,
            @RequestParam(name = "radiusKm", required = false, defaultValue = "10.0") Double radiusKm,
            @RequestParam(name = "radius", required = false, defaultValue = "10.0") Double radius) {

        Double finalLat = latitude != null ? latitude : lat;
        Double finalLng = longitude != null ? longitude : lon;
        Double finalRadius = radiusKm != null ? radiusKm : radius;

        if (finalLat == null || finalLng == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(stationService.getStationsNearby(finalLat, finalLng, finalRadius));
    }

    @GetMapping("/search-by-address")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<?> getStationsByAddress(
            @RequestParam String address,
            @RequestParam(defaultValue = "15.0") Double radiusKm) {

        double[] coords = geocodingService.getCoordinatesForAddress(address);
        if (coords == null) {
            return ResponseEntity.badRequest().body("Nie znaleziono podanego adresu.");
        }

        List<ChargingStationDto> stations = stationService.getStationsNearby(coords[0], coords[1], radiusKm);

        Map<String, Object> response = new HashMap<>();
        response.put("latitude", coords[0]);
        response.put("longitude", coords[1]);
        response.put("stations", stations);

        return ResponseEntity.ok(response);
    }
}