package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChargingStationRepository extends JpaRepository<ChargingStation, Long> {

    @Query(value = "SELECT * FROM charging_stations cs WHERE ST_DWithin(cs.location::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radiusInMeters)", nativeQuery = true)
    List<ChargingStation> findStationsWithinRadius(
            @Param("latitude") Double latitude,
            @Param("longitude") Double longitude,
            @Param("radiusInMeters") Double radiusInMeters
    );
}
