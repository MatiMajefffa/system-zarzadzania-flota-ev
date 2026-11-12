package com.evfleet.systemzarzadzaniaflotaev.dto;

import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;

import java.time.LocalDateTime;
import java.util.List;

public record VehicleDetailsDto(VehicleType vehicleType, double estimatedRangeKm, long finishedRoutes,
                                RouteSummary lastRoute, RouteSummary activeRoute, List<ReportSummary> reports) {

    public record RouteSummary(String startAddress, String endAddress, String driverName, String status,
                               Double distanceKm, LocalDateTime startedAt, Long drivingMinutes) {
    }

    public record ReportSummary(String description, String type, String employeeId, String status, LocalDateTime createdAt) {
    }
}
