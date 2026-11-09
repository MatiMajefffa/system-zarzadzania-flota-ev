package com.evfleet.systemzarzadzaniaflotaev.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Locale;

@Service
@Slf4j
public class WeatherService {

    // Temperatura neutralna dla zużycia energii, gdy pogoda jest niedostępna
    private static final double FALLBACK_TEMPERATURE_C = 15.0;

    private final RestClient restClient;
    private final String weatherUrl;

    public WeatherService(@Value("${application.weather.url}") String weatherUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
        this.weatherUrl = weatherUrl;
    }

    public double getCurrentTemperature(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return FALLBACK_TEMPERATURE_C;
        }

        String url = String.format(Locale.US, "%s/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m",
                weatherUrl, latitude, longitude);
        try {
            OpenMeteoResponse response = restClient.get().uri(url).retrieve().body(OpenMeteoResponse.class);
            if (response != null && response.current() != null && response.current().temperature_2m() != null) {
                return response.current().temperature_2m();
            }
            log.warn("Serwis pogodowy nie zwrócił temperatury, przyjęto {}°C", FALLBACK_TEMPERATURE_C);
        } catch (Exception e) {
            log.warn("Nie udało się pobrać temperatury, przyjęto {}°C: {}", FALLBACK_TEMPERATURE_C, e.getMessage());
        }
        return FALLBACK_TEMPERATURE_C;
    }

    private record OpenMeteoResponse(Current current) {
    }

    private record Current(Double temperature_2m) {
    }
}
