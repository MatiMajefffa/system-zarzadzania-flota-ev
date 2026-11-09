package com.evfleet.systemzarzadzaniaflotaev.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    public static final String TYPE_SOS = "SOS";
    public static final String TYPE_ISSUE = "USTERKA";
    public static final String TYPE_ROUTE_STATUS = "STATUS_TRASY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Treść zgłoszenia / opis problemu / usterki
    @Column(nullable = false, length = 1000)
    private String description;

    // Typ powiadomienia (np. "SOS", "USTERKA", "UWAGA")
    private String type;

    // ID lub numer rejestracyjny samochodu, którego dotyczy zgłoszenie
    private String vehicleRegistration;

    // Kto zgłosił (np. e-mail lub ID pracownika)
    private String employeeId;

    // Data i godzina zgłoszenia
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Status (np. "NOWY", "W_TOKU", "ROZWIAZANY", "ODCZYTANY")
    @Builder.Default
    private String status = "NOWY";

    // Automatyczne ustawienie aktualnej daty oraz domyślnego statusu przed zapisem do bazy
    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null || this.status.trim().isEmpty() || this.status.equals("NOWY")) {
            this.status = "NIEODCZYTANY";
        }
    }
}