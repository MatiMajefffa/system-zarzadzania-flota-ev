package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import com.evfleet.systemzarzadzaniaflotaev.repository.ChargingStationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChargingStationSyncService {

    private final ChargingStationRepository stationRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public int fetchAndSaveExternalStations() {
        // Twój klucz API
        String apiKey = "5a58f828-26d5-4504-80f4-410d2ea61f34";

        String url = "https://api.openchargemap.io/v3/poi/?" +
                "output=json" +
                "&countrycode=PL" +
                "&latitude=50.2649" +
                "&longitude=19.0238" +
                "&distance=70" +
                "&distanceunit=KM" +
                "&maxresults=250" +
                "&compact=true" +
                "&verbose=false" +
                "&key=" + apiKey;

        try {
            String jsonResponse = restTemplate.getForObject(url, String.class);
            if (jsonResponse == null || jsonResponse.trim().isEmpty()) {
                return 0;
            }

            JsonNode rootArray = objectMapper.readTree(jsonResponse);
            if (!rootArray.isArray()) {
                return 0;
            }

            List<ChargingStation> stationsToSave = new ArrayList<>();

            for (JsonNode item : rootArray) {
                JsonNode addressInfo = item.path("AddressInfo");
                if (addressInfo.isMissingNode() || addressInfo.isNull()) continue;

                double lat = addressInfo.path("Latitude").asDouble(0.0);
                double lng = addressInfo.path("Longitude").asDouble(0.0);
                if (lat == 0.0 || lng == 0.0) continue;

                String name = addressInfo.path("Title").asText("Stacja Ładowania EV");

                double powerKw = 22.0;
                JsonNode connections = item.path("Connections");
                if (connections.isArray() && connections.size() > 0) {
                    double kw = connections.get(0).path("PowerKW").asDouble(0.0);
                    if (kw > 0) {
                        powerKw = kw;
                    }
                }

                ChargingStation station = new ChargingStation();
                station.setName(name);
                station.setPowerKW(powerKw);
                station.setIsAvailable(true);

                // Geometria PostGIS (SRID 4326: X=Longitude, Y=Latitude)
                station.setLocation(geometryFactory.createPoint(new Coordinate(lng, lat)));

                stationsToSave.add(station);
            }

            stationRepository.deleteAll();
            List<ChargingStation> saved = stationRepository.saveAll(stationsToSave);
            return saved.size();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Błąd podczas synchronizacji stacji z OCM: " + e.getMessage(), e);
        }
    }
}