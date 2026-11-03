package com.evfleet.systemzarzadzaniaflotaev.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

@Service
public class GeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public double[] getCoordinatesForAddress(String address) {
        try {
            String url = "https://nominatim.openstreetmap.org/search?format=json&q=" + address + ",Polska&limit=1";

            HttpHeaders headers = new HttpHeaders();
            headers.add("User-Agent", "EVFleetManagementApp/1.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            if (root.isArray() && root.size() > 0) {
                double lat = root.get(0).path("lat").asDouble();
                double lon = root.get(0).path("lon").asDouble();
                return new double[]{lat, lon};
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}