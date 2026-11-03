package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.ExternalStationDto;
import com.evfleet.systemzarzadzaniaflotaev.dto.OcmStationResponse;
import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import com.evfleet.systemzarzadzaniaflotaev.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChargingStationSyncService {

    private final ChargingStationRepository stationRepository;

    // Nowoczesny klient HTTP ze Spring Boot 3 do pobierania danych z Internetu
    private final RestClient restClient = RestClient.create();

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * 1. Automatyczne pobieranie stacji z zewnętrznego API (Open Charge Map) przez RestClient
     */
    public int fetchAndSaveExternalStations() {
        String url = "https://api.openchargemap.io/v3/poi/?countrycode=PL&maxresults=20&compact=true";

        try {
            OcmStationResponse[] externalStations = restClient.get()
                    .uri(url)
                    .header("User-Agent", "EV-Fleet-Management-System")
                    .retrieve()
                    .body(OcmStationResponse[].class);

            if (externalStations == null) {
                return 0;
            }

            int savedCount = 0;
            for (OcmStationResponse ocmDto : externalStations) {
                if (ocmDto.getAddressInfo() != null &&
                        ocmDto.getAddressInfo().getLatitude() != null &&
                        ocmDto.getAddressInfo().getLongitude() != null) {

                    ChargingStation station = new ChargingStation();
                    station.setName(ocmDto.getAddressInfo().getTitle() != null ? ocmDto.getAddressInfo().getTitle() : "Stacja zewnętrzna");
                    station.setPowerKW(50.0); // Domyślna moc
                    station.setIsAvailable(true);

                    // Konwersja współrzędnych na punkt PostGIS (X = Longitude, Y = Latitude)
                    Point point = geometryFactory.createPoint(
                            new Coordinate(ocmDto.getAddressInfo().getLongitude(), ocmDto.getAddressInfo().getLatitude())
                    );
                    station.setLocation(point);

                    stationRepository.save(station);
                    savedCount++;
                }
            }
            return savedCount;

        } catch (Exception e) {
            throw new RuntimeException("Błąd podczas pobierania stacji z zewnętrznego API: " + e.getMessage(), e);
        }
    }

    /**
     * 2. Ręczna synchronizacja / import przesłanej listy stacji (obsługuje endpoint /api/stations/sync)
     */
    public int syncStations(List<ExternalStationDto> externalStations) {
        int savedCount = 0;
        for (ExternalStationDto extDto : externalStations) {
            if (extDto.getLongitude() != null && extDto.getLatitude() != null) {
                ChargingStation station = new ChargingStation();
                station.setName(extDto.getName() != null ? extDto.getName() : "Stacja importowana");
                station.setPowerKW(extDto.getPowerKW() != null ? extDto.getPowerKW() : 50.0);
                station.setIsAvailable(extDto.getIsAvailable() != null ? extDto.getIsAvailable() : true);

                Point point = geometryFactory.createPoint(
                        new Coordinate(extDto.getLongitude(), extDto.getLatitude())
                );
                station.setLocation(point);

                stationRepository.save(station);
                savedCount++;
            }
        }
        return savedCount;
    }
}