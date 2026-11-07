package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.dto.AuthRequest;
import com.evfleet.systemzarzadzaniaflotaev.dto.AuthResponse;
import com.evfleet.systemzarzadzaniaflotaev.dto.RegisterRequest;
import com.evfleet.systemzarzadzaniaflotaev.security.AuthenticationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService service;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticate(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(service.authenticate(request));
    }

    // NOWY ENDPOINT: Odzyskiwanie ID po adresie e-mail
    @GetMapping("/get-id-by-email")
    public ResponseEntity<?> getIdByEmail(@RequestParam String email) {
        try {
            Long employeeId = service.getIdByEmail(email);
            return ResponseEntity.ok(Map.of("employeeId", employeeId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}