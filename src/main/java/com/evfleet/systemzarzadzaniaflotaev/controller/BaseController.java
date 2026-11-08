package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.BaseLocation;
import com.evfleet.systemzarzadzaniaflotaev.repository.BaseLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bases")
@RequiredArgsConstructor
public class BaseController {

    private final BaseLocationRepository baseLocationRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<List<BaseLocation>> getAllBases() {
        return ResponseEntity.ok(baseLocationRepository.findAll());
    }
}