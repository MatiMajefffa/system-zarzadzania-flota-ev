package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.DriverNotification;
import com.evfleet.systemzarzadzaniaflotaev.model.Role;
import com.evfleet.systemzarzadzaniaflotaev.repository.DriverNotificationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.UserRepository;
import com.evfleet.systemzarzadzaniaflotaev.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
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

    private static final int MAX_MESSAGE_LENGTH = 900;

    private final DriverNotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public record SendMessageRequest(Long employeeId, String message, Boolean important) {
        boolean isImportant() {
            return Boolean.TRUE.equals(important);
        }
    }

    // Wiadomość od menedżera do wybranego kierowcy
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageRequest request) {
        if (request.employeeId() == null
                || userRepository.findById(request.employeeId()).filter(user -> user.getRole() == Role.DRIVER).isEmpty()) {
            return ResponseEntity.badRequest().body("Wybrany użytkownik nie jest kierowcą.");
        }
        if (!StringUtils.hasText(request.message()) || request.message().length() > MAX_MESSAGE_LENGTH) {
            return ResponseEntity.badRequest().body("Wiadomość musi mieć od 1 do " + MAX_MESSAGE_LENGTH + " znaków.");
        }

        DriverNotification notification = new DriverNotification();
        notification.setEmployeeId(String.valueOf(request.employeeId()));
        notification.setType(request.isImportant() ? "WAZNA_WIADOMOSC" : "WIADOMOSC");
        notification.setDescription((request.isImportant() ? "Ważna wiadomość od menedżera: " : "Wiadomość od menedżera: ")
                + request.message().trim());
        return ResponseEntity.ok(notificationRepository.save(notification));
    }

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