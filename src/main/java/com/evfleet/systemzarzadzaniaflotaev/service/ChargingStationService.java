package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.ChargingStationDto;
import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import com.evfleet.systemzarzadzaniaflotaev.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChargingStationService {

    private final ChargingStationRepository stationRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    // Pobranie wszystkich stacji
    public List<ChargingStationDto> getAllStations() {
        return stationRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Pobranie stacji po ID
    public Optional<ChargingStationDto> getStationById(Long id) {
        return stationRepository.findById(id).map(this::convertToDto);
    }

    // Wyszukiwanie stacji w promieniu (promień w kilometrach konwertowany na metry)
    public List<ChargingStationDto> getStationsNearby(Double latitude, Double longitude, Double radiusKm) {
        Double radiusInMeters = radiusKm * 1000.0;
        return stationRepository.findStationsWithinRadius(latitude, longitude, radiusInMeters).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Metoda pomocnicza mapująca encję na DTO
    private ChargingStationDto convertToDto(ChargingStation station) {
        ChargingStationDto dto = new ChargingStationDto();
        dto.setId(station.getId());
        dto.setName(station.getName());
        dto.setPowerKW(station.getPowerKW());
        dto.setIsAvailable(station.getIsAvailable());
        if (station.getLocation() != null) {
            dto.setLongitude(station.getLocation().getX());
            dto.setLatitude(station.getLocation().getY());
        }
        return dto;
    }
}
