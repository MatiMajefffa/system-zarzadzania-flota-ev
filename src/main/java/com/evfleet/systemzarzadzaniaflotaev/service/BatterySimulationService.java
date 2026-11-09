package com.evfleet.systemzarzadzaniaflotaev.service;

import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BatterySimulationService {

    public static final double DEFAULT_CHARGER_POWER_KW = 22.0;
    public static final double CHARGING_EFFICIENCY = 0.9;
    public static final int AUTO_CHARGE_THRESHOLD_PERCENT = 80;
    // Stan baterii po trasie z postojem - kierowca doładowuje auto tak, aby dojechać do celu z rezerwą
    public static final int RESERVE_AFTER_CHARGING_STOP_PERCENT = 10;

    private final VehicleRepository vehicleRepository;

    // Ile razy symulacja ładowania biegnie szybciej niż w rzeczywistości (60 = 1 godzina w 1 minutę)
    @Value("${application.simulation.charging-speed}")
    private double chargingSpeed;

    // Średnie zużycie w kWh/km dla typu pojazdu
    public double getBaseConsumption(VehicleType type) {
        if (type == null) {
            return 0.18;
        }
        return switch (type) {
            case OSOBOWY -> 0.18;
            case MALY_DOSTAWCZAK -> 0.22;
            case DUZY_DOSTAWCZAK -> 0.30;
        };
    }

    // Mnożnik zużycia: ogrzewanie przy chłodzie, klimatyzacja przy upale, 10-30°C to warunki normalne
    public double getTemperatureFactor(double temperatureC) {
        if (temperatureC < -15) return 1.60;
        if (temperatureC < -5) return 1.45;
        if (temperatureC < 5) return 1.25;
        if (temperatureC < 10) return 1.10;
        if (temperatureC < 30) return 1.00;
        if (temperatureC < 35) return 1.10;
        return 1.20;
    }

    public double getConsumption(Vehicle vehicle, double temperatureC) {
        return getBaseConsumption(vehicle.getVehicleType()) * getTemperatureFactor(temperatureC);
    }

    // Odejmuje energię za przejechany odcinek i dolicza przebieg
    public void applyDrive(Vehicle vehicle, Double distanceKm, double temperatureC, boolean hadChargingStop) {
        if (distanceKm == null) {
            return;
        }

        double usedPercent = distanceKm * getConsumption(vehicle, temperatureC) / vehicle.getBatteryCapacityKWh() * 100;
        int minimumPercent = hadChargingStop ? RESERVE_AFTER_CHARGING_STOP_PERCENT : 0;
        vehicle.setStateOfCharge((int) Math.round(Math.max(minimumPercent, vehicle.getStateOfCharge() - usedPercent)));

        double mileage = vehicle.getTotalMileage() != null ? vehicle.getTotalMileage() : 0.0;
        vehicle.setTotalMileage(mileage + distanceKm);
    }

    // Rozpoczyna ładowanie w bazie do 100%; czas zależy od brakującej energii i mocy ładowarki
    public void startCharging(Vehicle vehicle) {
        double missingKWh = (100 - vehicle.getStateOfCharge()) / 100.0 * vehicle.getBatteryCapacityKWh();
        double realSeconds = missingKWh / (DEFAULT_CHARGER_POWER_KW * CHARGING_EFFICIENCY) * 3600;

        LocalDateTime now = LocalDateTime.now();
        vehicle.setStatus(VehicleStatus.LADOWANIE);
        vehicle.setChargingStartSoc(vehicle.getStateOfCharge());
        vehicle.setChargingStartedAt(now);
        vehicle.setChargingEndsAt(now.plus(Duration.ofMillis((long) (realSeconds / chargingSpeed * 1000))));
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void updateChargingVehicles() {
        LocalDateTime now = LocalDateTime.now();
        for (Vehicle vehicle : vehicleRepository.findByStatus(VehicleStatus.LADOWANIE)) {
            if (vehicle.getChargingEndsAt() == null) {
                continue; // Status ustawiony ręcznie w formularzu, bez symulowanego ładowania
            }

            if (now.isBefore(vehicle.getChargingEndsAt())) {
                double total = Duration.between(vehicle.getChargingStartedAt(), vehicle.getChargingEndsAt()).toMillis();
                double elapsed = Duration.between(vehicle.getChargingStartedAt(), now).toMillis();
                int startSoc = vehicle.getChargingStartSoc();
                vehicle.setStateOfCharge((int) Math.round(startSoc + (100 - startSoc) * elapsed / total));
            } else {
                vehicle.setStateOfCharge(100);
                vehicle.setStatus(VehicleStatus.DOSTEPNY);
                vehicle.setChargingStartSoc(null);
                vehicle.setChargingStartedAt(null);
                vehicle.setChargingEndsAt(null);
            }
        }
    }
}
