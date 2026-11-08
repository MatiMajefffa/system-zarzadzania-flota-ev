package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.Role;
import com.evfleet.systemzarzadzaniaflotaev.model.User;
import com.evfleet.systemzarzadzaniaflotaev.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    // Pobieranie wszystkich użytkowników z rolą DRIVER dla panelu menedżera
    @GetMapping("/drivers")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<User>> getAllDrivers() {
        // Pobiera użytkowników, których rola to DRIVER
        List<User> drivers = userRepository.findByRole(Role.DRIVER);
        return ResponseEntity.ok(drivers);
    }

    // Pobieranie wszystkich użytkowników systemu (opcjonalnie dla Administratora)
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}