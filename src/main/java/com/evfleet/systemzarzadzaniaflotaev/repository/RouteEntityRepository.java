package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RouteEntityRepository extends JpaRepository<RouteEntity, Long> {
    // Znajdź ostatnią aktywną/zleconą trasę dla danego pracownika
    Optional<RouteEntity> findTopByEmployeeIdOrderByIdDesc(String employeeId);

    List<RouteEntity> findByStatusInOrderByIdDesc(Collection<String> statuses);

    List<RouteEntity> findTop10ByEmployeeIdAndStatusOrderByIdDesc(String employeeId, String status);

    boolean existsByEmployeeIdAndStatusIn(String employeeId, Collection<String> statuses);

    boolean existsByVehicleIdAndStatusIn(Long vehicleId, Collection<String> statuses);

    Optional<RouteEntity> findTopByVehicleIdAndStatusInOrderByIdDesc(Long vehicleId, Collection<String> statuses);

    long countByVehicleIdAndStatus(Long vehicleId, String status);
}