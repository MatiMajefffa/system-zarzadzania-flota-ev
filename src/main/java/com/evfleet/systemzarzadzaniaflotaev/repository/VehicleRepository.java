package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    // Znajdź pojazdy o konkretnym statusie (np. DOSTEPNY, W_TRASIE)
    List<Vehicle> findByStatus(VehicleStatus status);

    // Znajdź pojazdy, których stan naładowania (SoC) jest mniejszy niż podany próg (np. niski stan baterii)
    List<Vehicle> findByStateOfChargeLessThan(Integer maxSoC);
}