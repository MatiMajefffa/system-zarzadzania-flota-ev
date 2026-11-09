package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.DriverNotification;
import com.evfleet.systemzarzadzaniaflotaev.repository.DriverNotificationRepository;
import com.evfleet.systemzarzadzaniaflotaev.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

// Kierowca ma dostęp wyłącznie do własnych powiadomień - ID pochodzi z tokenu, a nie z żądania
@RestController
@RequestMapping("/api/driver-notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverNotificationController {

    private static final Set<String> ALLOWED_STATUSES = Set.of("NIEODCZYTANY", "ODCZYTANY");

    private final DriverNotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<List<DriverNotification>> getMyNotifications() {
        return ResponseEntity.ok(notificationRepository.findByEmployeeIdOrderByCreatedAtDesc(currentEmployeeId()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DriverNotification> updateStatus(@PathVariable Long id, @RequestParam String status) {
        if (!ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().build();
        }

        return notificationRepository.findByIdAndEmployeeId(id, currentEmployeeId())
                .map(notification -> {
                    notification.setStatus(status);
                    return ResponseEntity.ok(notificationRepository.save(notification));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return notificationRepository.findByIdAndEmployeeId(id, currentEmployeeId())
                .map(notification -> {
                    notificationRepository.delete(notification);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String currentEmployeeId() {
        return String.valueOf(SecurityUtils.getCurrentUserId());
    }
}