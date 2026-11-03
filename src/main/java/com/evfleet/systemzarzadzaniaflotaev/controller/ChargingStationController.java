package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.ChargingStationDto;
import com.evfleet.systemzarzadzaniaflotaev.dto.ExternalStationDto;
import com.evfleet.systemzarzadzaniaflotaev.service.ChargingStationService;
import com.evfleet.systemzarzadzaniaflotaev.service.ChargingStationSyncService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
public class ChargingStationController {

    private final ChargingStationService stationService;
    private final ChargingStationSyncService syncService;

    @GetMapping
    public List<ChargingStationDto> getAllStations() {
        return stationService.getAllStations();
    }
    // POST: Pobierz stacje z zewnętrznego API i zapisz w bazie PostGIS
    @PostMapping("/fetch-external")
    public ResponseEntity<String> fetchExternalStations() {
        int savedCount = syncService.fetchAndSaveExternalStations();
        return ResponseEntity.ok("Pomyślnie pobrano i zapisano w bazie PostGIS stacji: " + savedCount);
    }
    // Endpoint do symulacji/wywołania importu danych z zewnętrznego API
    @PostMapping("/sync")
    public ResponseEntity<String> syncExternalStations(@RequestBody List<ExternalStationDto> externalStations) {
        int imported = syncService.syncStations(externalStations);
        return ResponseEntity.ok("Pomyślnie zsynchronizowano i zapisano w PostGIS stacji: " + imported);
    }

    // Wyszukiwanie przestrzenne PostGIS w promieniu X kilometrów
    @GetMapping("/nearby")
    public List<ChargingStationDto> getStationsNearby(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(defaultValue = "10.0") Double radius) {
        return stationService.getStationsNearby(lat, lon, radius);
    }
}
