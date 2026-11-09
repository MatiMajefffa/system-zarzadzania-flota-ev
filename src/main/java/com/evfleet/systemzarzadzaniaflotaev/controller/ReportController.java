package com.evfleet.systemzarzadzaniaflotaev.controller;

import com.evfleet.systemzarzadzaniaflotaev.model.Report;
import com.evfleet.systemzarzadzaniaflotaev.model.Role;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import com.evfleet.systemzarzadzaniaflotaev.model.User;
import com.evfleet.systemzarzadzaniaflotaev.repository.ReportRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.RouteEntityRepository;
import com.evfleet.systemzarzadzaniaflotaev.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final int MAX_DESCRIPTION_LENGTH = 1000;
    private static final String INVALID_DESCRIPTION_MESSAGE = "Treść zgłoszenia musi mieć od 1 do 1000 znaków.";

    public record UpdateReportRequest(String description) {
    }

    private final ReportRepository reportRepository;
    private final RouteEntityRepository routeRepository;

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
    public ResponseEntity<?> createReport(@RequestBody Report report) {
        User currentUser = SecurityUtils.getCurrentUser();
        if (currentUser.getRole() == Role.DRIVER) {
            String employeeId = String.valueOf(currentUser.getId());
            RouteEntity route = routeRepository.findTopByEmployeeIdOrderByIdDesc(employeeId)
                    .filter(lastRoute -> RouteEntity.STATUS_IN_PROGRESS.equals(lastRoute.getStatus()))
                    .orElse(null);
            if (route == null) {
                return ResponseEntity.status(409).body("Zgłoszenie można wysłać dopiero po odebraniu auta.");
            }
            if (!isValidDescription(report.getDescription())) {
                return ResponseEntity.badRequest().body(INVALID_DESCRIPTION_MESSAGE);
            }

            // Pola zgłoszenia kierowcy ustala serwer, a nie treść żądania
            report.setId(null);
            report.setEmployeeId(employeeId);
            report.setVehicleRegistration(route.getVehicleRegistrationNumber());
            report.setType(Report.TYPE_SOS.equals(report.getType()) ? Report.TYPE_SOS : Report.TYPE_ISSUE);
            report.setStatus("NOWY");
            report.setCreatedAt(LocalDateTime.now());
        }

        Report savedReport = reportRepository.save(report);
        return ResponseEntity.ok(savedReport);
    }

    // Historia zgłoszeń zalogowanego kierowcy, bez automatycznych informacji o postępie trasy
    @GetMapping("/mine")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<Report>> getMyReports() {
        return ResponseEntity.ok(reportRepository.findByEmployeeIdOrderByCreatedAtDesc(currentEmployeeId()).stream()
                .filter(report -> !Report.TYPE_ROUTE_STATUS.equals(report.getType()))
                .toList());
    }

    // Po zmianie treści zgłoszenie wraca do menedżera jako nieodczytane
    @PutMapping("/mine/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> updateMyReport(@PathVariable Long id, @RequestBody UpdateReportRequest request) {
        if (!isValidDescription(request.description())) {
            return ResponseEntity.badRequest().body(INVALID_DESCRIPTION_MESSAGE);
        }

        Report report = findEditableReport(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        report.setDescription(request.description().trim());
        report.setStatus("NIEODCZYTANY");
        return ResponseEntity.ok(reportRepository.save(report));
    }

    @DeleteMapping("/mine/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Void> deleteMyReport(@PathVariable Long id) {
        Report report = findEditableReport(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        reportRepository.delete(report);
        return ResponseEntity.noContent().build();
    }

    // Alarmów SOS i automatycznych informacji o trasie kierowca nie zmienia
    private Report findEditableReport(Long id) {
        return reportRepository.findByIdAndEmployeeId(id, currentEmployeeId())
                .filter(report -> !Report.TYPE_SOS.equals(report.getType()) && !Report.TYPE_ROUTE_STATUS.equals(report.getType()))
                .orElse(null);
    }

    private String currentEmployeeId() {
        return String.valueOf(SecurityUtils.getCurrentUserId());
    }

    private boolean isValidDescription(String description) {
        return StringUtils.hasText(description) && description.length() <= MAX_DESCRIPTION_LENGTH;
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
