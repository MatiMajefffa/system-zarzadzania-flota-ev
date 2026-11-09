package com.evfleet.systemzarzadzaniaflotaev.dto;

// Czas przejazdu liczony od odbioru pojazdu do dojazdu do celu; null dla tras bez zapisanych czasów
public record RouteHistoryDto(Long id, String startAddress, String endAddress, Long durationMinutes) {
}
