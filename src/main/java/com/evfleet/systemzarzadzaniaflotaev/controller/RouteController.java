package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.service.RoutePlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RoutePlanningService routePlanningService;

    @GetMapping("/plan")
    public ResponseEntity<RoutePlanningService.RoutePlanResult> planRoute(
            @RequestParam Long vehicleId,
            @RequestParam double startLon,
            @RequestParam double startLat,
            @RequestParam double endLon,
            @RequestParam double endLat,
            @RequestParam(defaultValue = "15.0") double temperature) {

        RoutePlanningService.RoutePlanResult result = routePlanningService.planRoute(
                vehicleId, startLon, startLat, endLon, endLat, temperature
        );
        return ResponseEntity.ok(result);
    }
}