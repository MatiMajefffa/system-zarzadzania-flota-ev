package com.evfleet.systemzarzadzaniaflotaev.dto;

import com.evfleet.systemzarzadzaniaflotaev.model.Role;

public record RegisterRequest(
        String firstname,
        String lastname,
        String email,
        String password,
        String secretCode,
        Role role
) {}