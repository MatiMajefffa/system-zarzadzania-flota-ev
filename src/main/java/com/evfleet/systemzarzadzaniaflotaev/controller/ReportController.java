package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.Report;
import com.evfleet.systemzarzadzaniaflotaev.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportRepository reportRepository;

    // Pobieranie wszystkich zgłoszeń posortowanych od najnowszego do najstarszego
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<Report>> getAllReports() {
        List<Report> reports = reportRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(reports);
    }

    // Tworzenie nowego zgłoszenia / powiadomienia (np. z poziomu panelu kierowcy)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DRIVER')")
    public ResponseEntity<Report> createReport(@RequestBody Report report) {
        Report savedReport = reportRepository.save(report);
        return ResponseEntity.ok(savedReport);
    }

    // Zmiana statusu zgłoszenia (np. z "NOWY" na "ODCZYTANY" / "ROZWIAZANY")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Report> updateReportStatus(@PathVariable Long id, @RequestParam String status) {
        return reportRepository.findById(id)
                .map(report -> {
                    report.setStatus(status);
                    return ResponseEntity.ok(reportRepository.save(report));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Usuwanie powiadomienia po jego odczytaniu lub obsłużeniu
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        if (reportRepository.existsById(id)) {
            reportRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
