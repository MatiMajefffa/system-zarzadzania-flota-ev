package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.dto.RouteResponseDto;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteChargingStop;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.evfleet.systemzarzadzaniaflotaev.service.GeoDistance.haversineKm;

/**
 * Symuluje pozycję kierowcy: odtwarza przejazd po zapisanej trasie na podstawie czasu
 * od odbioru pojazdu, uwzględniając postoje ładowania i powrót do bazy.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteTrackingService {

    public enum Phase { DO_CELU, LADOWANIE, NA_MIEJSCU, POWROT, W_BAZIE }

    public record SimulatedPosition(Long routeId, double latitude, double longitude, Phase phase,
                                    int progressPercent, String stationName) {
    }

    public record RouteTracking(SimulatedPosition position, List<double[]> path) {
    }

    private final RouteService routeService;

    // Ile razy symulowany przejazd biegnie szybciej niż w rzeczywistości
    @Value("${application.simulation.driving-speed}")
    private double drivingSpeed;

    // Trasa zaczyna się w miejscu kierowcy; gdy jest nieznane lub poza mapą, startuje z bazy
    public void recordOutboundPath(RouteEntity route, Double driverLatitude, Double driverLongitude) {
        if (route.getStartLat() == null || route.getEndLat() == null) {
            return;
        }

        boolean startedFromDriver = driverLatitude != null && driverLongitude != null
                && storePath(route, outboundPoints(route, driverLongitude, driverLatitude));
        if (!startedFromDriver) {
            storePath(route, outboundPoints(route, route.getStartLng(), route.getStartLat()));
        }
    }

    // Po dojeździe symulacja prowadzi z celu do bazy
    public void recordReturnPath(RouteEntity route) {
        if (route.getStartLat() == null || route.getEndLat() == null) {
            return;
        }
        if (!storePath(route, List.of(new double[]{route.getEndLng(), route.getEndLat()}, new double[]{route.getStartLng(), route.getStartLat()}))) {
            route.setPathGeometry(null);
        }
    }

    private List<double[]> outboundPoints(RouteEntity route, double originLon, double originLat) {
        List<double[]> points = new ArrayList<>();
        points.add(new double[]{originLon, originLat});
        route.getChargingStops().forEach(stop -> points.add(new double[]{stop.getLongitude(), stop.getLatitude()}));
        points.add(new double[]{route.getEndLng(), route.getEndLat()});
        return points;
    }

    // Brak mapy nie może blokować kierowcy, więc błąd oznacza tylko brak podglądu pozycji
    private boolean storePath(RouteEntity route, List<double[]> points) {
        try {
            RouteResponseDto.Route path = routeService.getRouteThroughPoints(points);
            route.setPathGeometry(path.getGeometry().getCoordinates().stream()
                    .map(point -> String.format(Locale.US, "%.6f,%.6f", point.get(0), point.get(1)))
                    .collect(Collectors.joining(";")));
            route.setPlannedDurationSeconds(path.getDuration());
            return true;
        } catch (RuntimeException e) {
            log.warn("Nie udało się zapisać przebiegu trasy {}: {}", route.getId(), e.getMessage());
            return false;
        }
    }

    // Przebieg trasy jako punkty [szerokość, długość] i aktualna pozycja dla panelu kierowcy
    public Optional<RouteTracking> getTracking(RouteEntity route, LocalDateTime now) {
        return getPosition(route, now).map(position -> new RouteTracking(position,
                parseLine(route.getPathGeometry()).stream().map(point -> new double[]{point[1], point[0]}).toList()));
    }

    public Optional<SimulatedPosition> getPosition(RouteEntity route, LocalDateTime now) {
        if (route.getStartedAt() == null || route.getPathGeometry() == null
                || route.getPlannedDurationSeconds() == null || route.getPlannedDurationSeconds() <= 0) {
            return Optional.empty();
        }

        List<double[]> line = parseLine(route.getPathGeometry());
        double[] kmAlongLine = cumulativeKm(line);
        return Optional.of(route.getArrivedAt() != null
                ? returnPosition(route, line, kmAlongLine, now)
                : outboundPosition(route, line, kmAlongLine, now));
    }

    private SimulatedPosition outboundPosition(RouteEntity route, List<double[]> line, double[] kmAlongLine, LocalDateTime now) {
        double duration = route.getPlannedDurationSeconds();
        double totalKm = kmAlongLine[kmAlongLine.length - 1];
        double clock = simulatedSeconds(route.getStartedAt(), now);
        double chargingSoFar = 0;

        for (RouteChargingStop stop : route.getChargingStops()) {
            double stopKm = kmAlongLine[nearestIndex(line, stop.getLongitude(), stop.getLatitude())];
            double arrivalClock = stopKm / totalKm * duration + chargingSoFar;
            double chargingSeconds = stop.getChargingMinutes() * 60;

            if (clock < arrivalClock) {
                break;
            }
            if (clock < arrivalClock + chargingSeconds) {
                return position(route, line, kmAlongLine, stopKm / totalKm, Phase.LADOWANIE, stop.getName());
            }
            chargingSoFar += chargingSeconds;
        }

        double fraction = (clock - chargingSoFar) / duration;
        return fraction >= 1
                ? position(route, line, kmAlongLine, 1, Phase.NA_MIEJSCU, null)
                : position(route, line, kmAlongLine, fraction, Phase.DO_CELU, null);
    }

    private SimulatedPosition returnPosition(RouteEntity route, List<double[]> line, double[] kmAlongLine, LocalDateTime now) {
        double fraction = simulatedSeconds(route.getArrivedAt(), now) / route.getPlannedDurationSeconds();
        return fraction >= 1
                ? position(route, line, kmAlongLine, 1, Phase.W_BAZIE, null)
                : position(route, line, kmAlongLine, fraction, Phase.POWROT, null);
    }

    private double simulatedSeconds(LocalDateTime from, LocalDateTime now) {
        return Math.max(0, Duration.between(from, now).toMillis() / 1000.0 * drivingSpeed);
    }

    private SimulatedPosition position(RouteEntity route, List<double[]> line, double[] kmAlongLine, double fraction, Phase phase, String stationName) {
        double[] point = pointAt(line, kmAlongLine, fraction);
        return new SimulatedPosition(route.getId(), point[1], point[0], phase, (int) Math.round(fraction * 100), stationName);
    }

    private double[] pointAt(List<double[]> line, double[] kmAlongLine, double fraction) {
        double targetKm = fraction * kmAlongLine[kmAlongLine.length - 1];
        for (int i = 1; i < line.size(); i++) {
            if (kmAlongLine[i] >= targetKm) {
                double segmentKm = kmAlongLine[i] - kmAlongLine[i - 1];
                double ratio = segmentKm > 0 ? (targetKm - kmAlongLine[i - 1]) / segmentKm : 0;
                double[] from = line.get(i - 1);
                double[] to = line.get(i);
                return new double[]{from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio};
            }
        }
        return line.get(line.size() - 1);
    }

    private int nearestIndex(List<double[]> line, double lon, double lat) {
        int nearest = 0;
        double nearestKm = Double.MAX_VALUE;
        for (int i = 0; i < line.size(); i++) {
            double km = haversineKm(lon, lat, line.get(i)[0], line.get(i)[1]);
            if (km < nearestKm) {
                nearestKm = km;
                nearest = i;
            }
        }
        return nearest;
    }

    private double[] cumulativeKm(List<double[]> line) {
        double[] km = new double[line.size()];
        for (int i = 1; i < line.size(); i++) {
            km[i] = km[i - 1] + haversineKm(line.get(i - 1)[0], line.get(i - 1)[1], line.get(i)[0], line.get(i)[1]);
        }
        return km;
    }

    private List<double[]> parseLine(String geometry) {
        return Arrays.stream(geometry.split(";"))
                .map(point -> Arrays.stream(point.split(",")).mapToDouble(Double::parseDouble).toArray())
                .toList();
    }
}
