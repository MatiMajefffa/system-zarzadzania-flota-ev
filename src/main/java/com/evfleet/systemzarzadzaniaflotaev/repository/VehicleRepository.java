package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    // Spring Data JPA automatycznie dostarcza metody takie jak save(), findAll(), findById(), delete() itp.
    // Tutaj możemy w przyszłości dopisać własne zapytania, np. wyszukiwanie aut o niskim stanie baterii:
    // List<Vehicle> findByStateOfChargeLessThan(Integer soc);
}