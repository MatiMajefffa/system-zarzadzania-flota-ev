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

    // Opcjonalnie: powiązanie bezpośrednie z encją Vehicle (jeśli wolisz relację)
    // @ManyToOne
    // @JoinColumn(name = "vehicle_id")
    // private Vehicle vehicle;

    // Kto zgłosił (np. e-mail lub ID pracownika)
    private String employeeId;

    // Data i godzina zgłoszenia
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Status (np. "NOWY", "W_TOKU", "ROZWIAZANY")
    @Builder.Default
    private String status = "NOWY";
}
