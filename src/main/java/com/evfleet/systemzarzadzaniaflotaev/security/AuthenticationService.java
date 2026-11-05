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
        User user = User.builder()
                .role(Role.ADMIN) // Wymuszenie roli ADMIN przy rejestracji
                .password("")
                .build();
        user = repository.save(user);

        user.setPassword(passwordEncoder.encode(String.valueOf(user.getId())));
        repository.save(user);

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
}