package com.evfleet.systemzarzadzaniaflotaev.config;

import com.evfleet.systemzarzadzaniaflotaev.model.BaseLocation;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.repository.BaseLocationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final VehicleRepository vehicleRepository;
    private final BaseLocationRepository baseLocationRepository;

    @Override
    public void run(String... args) throws Exception {
        if (baseLocationRepository.count() == 0) {
            seedBases();
            System.out.println("✅ Pomyślnie załadowano 10 baz firmowych na Śląsku!");
        }
        // Jeśli w bazie jest mniej niż 30 pojazdów, czyścimy ją i wgrywamy nową flotę
        if (vehicleRepository.count() < 3) {
            vehicleRepository.deleteAll(); // Usuwa stare testowe auta
            seedVehicles();
            System.out.println("✅ Pomyślnie wyczyszczono i załadowano 30 pojazdów EV do bazy danych!");
        }
    }

    private void seedBases() {
        Object[][] baseData = {
                {"Baza Katowice", 50.2649, 19.0238},
                {"Baza Gliwice", 50.2945, 18.6714},
                {"Baza Zabrze", 50.3259, 18.7857},
                {"Baza Bytom", 50.3473, 18.9186},
                {"Baza Sosnowiec", 50.2865, 19.1042},
                {"Baza Tychy", 50.0123, 18.9856},
                {"Baza Rybnik", 50.0971, 18.5413},
                {"Baza Dąbrowa Górnicza", 50.3205, 19.1834},
                {"Baza Chorzów", 50.2975, 18.9513},
                {"Baza Ruda Śląska", 50.2923, 18.8517}
        };

        List<BaseLocation> bases = new ArrayList<>();
        for (Object[] data : (Object[][]) baseData) {
            BaseLocation base = new BaseLocation();
            base.setName((String) data[0]);
            base.setLatitude((Double) data[1]);
            base.setLongitude((Double) data[2]);
            bases.add(base);
        }

        baseLocationRepository.saveAll(bases);
    }

    private void seedVehicles() {
        // 10 Głównych baz (duże parkingi) i ich prefiksy rejestracyjne na Śląsku
        String[] bases = {
                "Katowice", "Gliwice", "Zabrze", "Bytom",
                "Sosnowiec", "Tychy", "Rybnik", "Dąbrowa Górnicza",
                "Chorzów", "Ruda Śląska"
        };

        String[] plates = {"SK", "SG", "SZ", "SY", "SO", "ST", "SR", "SD", "SH", "SL"};

        // Katalog 10 Ekskluzywnych aut EV (Nazwa, Bateria kWh)
        Object[][] luxuryCars = {
                {"Tesla Model S Plaid", 100.0}, {"Mercedes EQS 450+", 108.4},
                {"Porsche Taycan 4S", 93.4}, {"Audi RS e-tron GT", 93.4},
                {"BMW i7 xDrive60", 101.7}, {"Lucid Air Grand Touring", 112.0},
                {"Tesla Model X", 100.0}, {"Mercedes EQE 350", 90.6},
                {"Porsche Taycan Turbo", 93.4}, {"BMW iX xDrive50", 105.2}
        };

        // Katalog 10 Małych aut dostawczych EV (z małą paką)
        Object[][] smallVans = {
                {"Renault Kangoo Van E-Tech", 45.0}, {"Nissan Townstar EV", 44.0},
                {"Peugeot e-Partner", 50.0}, {"Citroen e-Berlingo Van", 50.0},
                {"Opel Combo-e Cargo", 50.0}, {"Toyota Proace City Electric", 50.0},
                {"Fiat E-Doblo", 50.0}, {"Renault Kangoo Maxi Z.E.", 33.0},
                {"Nissan e-NV200", 40.0}, {"Maxus eDeliver 3", 50.2}
        };

        // Katalog 10 Dużych aut dostawczych EV (z dużą paką)
        Object[][] largeVans = {
                {"Ford E-Transit", 68.0}, {"Mercedes eSprinter", 113.0},
                {"Fiat E-Ducato", 79.0}, {"Renault Master E-Tech", 52.0},
                {"Volkswagen e-Crafter", 35.8}, {"Maxus eDeliver 9", 88.5},
                {"Peugeot e-Boxer", 70.0}, {"Citroen e-Jumper", 70.0},
                {"Opel Movano-e", 70.0}, {"Iveco eDaily", 111.0}
        };

        List<Vehicle> fleet = new ArrayList<>();

        // Przypisujemy po 3 auta do każdego z 10 miast
        for (int i = 0; i < 10; i++) {
            String base = bases[i];
            String platePrefix = plates[i];

            // 1. Dodajemy Auto Ekskluzywne
            fleet.add(createVehicle(
                    platePrefix + " 1" + i + "00VIP",
                    (String) luxuryCars[i][0],
                    (Double) luxuryCars[i][1],
                    base,
                    1500.0 + (i * 200) // Przykładowy początkowy przebieg
            ));

            // 2. Dodajemy Małego Dostawczaka
            fleet.add(createVehicle(
                    platePrefix + " 2" + i + "00VAN",
                    (String) smallVans[i][0],
                    (Double) smallVans[i][1],
                    base,
                    12500.0 + (i * 1500)
            ));

            // 3. Dodajemy Dużego Dostawczaka
            fleet.add(createVehicle(
                    platePrefix + " 3" + i + "00TRK",
                    (String) largeVans[i][0],
                    (Double) largeVans[i][1],
                    base,
                    25000.0 + (i * 3000)
            ));
        }

        vehicleRepository.saveAll(fleet);
    }

    private Vehicle createVehicle(String registration, String model, Double battery, String base, Double mileage) {
        Vehicle v = new Vehicle();
        v.setRegistrationNumber(registration);
        v.setModel(model);
        v.setBatteryCapacityKWh(battery);
        // Auta na start w bazie mają losowo od 75% do 100% baterii
        v.setStateOfCharge(75 + (int)(Math.random() * 26));
        v.setStatus(VehicleStatus.DOSTEPNY);
        v.setIsBlocked(false);
        v.setTotalMileage(mileage);
        v.setCurrentBase(base);
        return v;
    }
}