package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    // Znajdź pojazdy o konkretnym statusie (np. DOSTEPNY, W_TRASIE)
    List<Vehicle> findByStatus(VehicleStatus status);

    // Znajdź pojazdy, których stan naładowania (SoC) jest mniejszy niż podany próg (np. niski stan baterii)
    List<Vehicle> findByStateOfChargeLessThan(Integer maxSoC);

    // Blokada wiersza, aby dwa równoczesne zlecenia nie zarezerwowały tego samego pojazdu
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Vehicle v where v.id = :id")
    Optional<Vehicle> findByIdForUpdate(@Param("id") Long id);
}