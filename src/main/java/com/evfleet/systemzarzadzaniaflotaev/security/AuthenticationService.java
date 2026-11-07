package com.evfleet.systemzarzadzaniaflotaev.security;

import com.evfleet.systemzarzadzaniaflotaev.dto.AuthRequest;
import com.evfleet.systemzarzadzaniaflotaev.dto.AuthResponse;
import com.evfleet.systemzarzadzaniaflotaev.dto.RegisterRequest;
import com.evfleet.systemzarzadzaniaflotaev.model.Role;
import com.evfleet.systemzarzadzaniaflotaev.model.User;
import com.evfleet.systemzarzadzaniaflotaev.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Logika przypisywania roli: jeśli podano sekretny kod "6969", to MANAGER, w przeciwnym razie DRIVER
        Role assignedRole = Role.DRIVER;
        if ("6969".equals(request.secretCode())) {
            assignedRole = Role.MANAGER;
        }

        User user = User.builder()
                .firstName(request.firstname())
                .lastName(request.lastname())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(assignedRole)
                .build();

        user = repository.save(user);

        var jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken, user.getId());
    }

    public AuthResponse authenticate(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        String.valueOf(request.employeeId()),
                        request.password()
                )
        );
        var user = repository.findById(request.employeeId()).orElseThrow();
        var jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken, user.getId());
    }

    // ==========================================
    // NOWA METODA: Odzyskiwanie ID po adresie e-mail
    // ==========================================
    public Long getIdByEmail(String email) {
        User user = repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono użytkownika o takim adresie e-mail."));
        return user.getId();
    }
}