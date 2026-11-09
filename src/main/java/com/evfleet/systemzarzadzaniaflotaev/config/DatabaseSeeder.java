package com.evfleet.systemzarzadzaniaflotaev.config;

import com.evfleet.systemzarzadzaniaflotaev.model.BaseLocation;
import com.evfleet.systemzarzadzaniaflotaev.model.ChargingStation;
import com.evfleet.systemzarzadzaniaflotaev.model.DriverNotification;
import com.evfleet.systemzarzadzaniaflotaev.model.Role;
import com.evfleet.systemzarzadzaniaflotaev.model.RouteEntity;
import com.evfleet.systemzarzadzaniaflotaev.model.User;
import com.evfleet.systemzarzadzaniaflotaev.model.Vehicle;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleStatus;
import com.evfleet.systemzarzadzaniaflotaev.model.Report;
import com.evfleet.systemzarzadzaniaflotaev.repository.BaseLocationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.ChargingStationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.DriverNotificationRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.ReportRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.RouteEntityRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.UserRepository;
import com.evfleet.systemzarzadzaniaflotaev.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import com.evfleet.systemzarzadzaniaflotaev.model.VehicleType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private static final String TEST_PASSWORD = "0000";

    private final VehicleRepository vehicleRepository;
    private final BaseLocationRepository baseLocationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ReportRepository reportRepository;
    private final ChargingStationRepository chargingStationRepository;
    private final RouteEntityRepository routeEntityRepository;
    private final DriverNotificationRepository driverNotificationRepository;

    // Każda tabela jest uzupełniana tylko wtedy, gdy jest pusta, więc istniejące dane pozostają bez zmian
    @Override
    public void run(String... args) throws Exception {
        if (baseLocationRepository.count() == 0) {
            seedBases();
            System.out.println("✅ Pomyślnie załadowano 10 baz firmowych na Śląsku!");
        }

        if (chargingStationRepository.count() == 0) {
            seedChargingStations();
            System.out.println("✅ Pomyślnie załadowano testowe stacje ładowania!");
        }

        if (vehicleRepository.count() == 0) {
            seedVehicles();
            System.out.println("✅ Pomyślnie załadowano 30 pojazdów EV do bazy danych!");
        }

        // Menedżer powstaje przed kierowcami, dzięki czemu w pustej bazie ma ID 1000
        if (userRepository.findByRole(Role.MANAGER).isEmpty()) {
            User manager = seedManager();
            System.out.println("✅ Utworzono konto menedżera testowego, ID: " + manager.getId() + ", hasło: " + TEST_PASSWORD);
        }

        if (userRepository.findByRole(Role.DRIVER).isEmpty()) {
            seedDrivers();
            System.out.println("✅ Pomyślnie wygenerowano 20 kont kierowców przypisanych do baz na Śląsku!");
        }

        if (routeEntityRepository.count() == 0) {
            seedRoutes();
        }

        if (reportRepository.count() == 0) {
            seedReports();
        }
    }

    private void seedChargingStations() {
        Object[][] stationData = {
                {"Stacja testowa Katowice Centrum", 50.2599, 19.0216, 150.0, true},
                {"Stacja testowa Katowice Giszowiec", 50.2146, 19.0729, 50.0, true},
                {"Stacja testowa Gliwice Centrum", 50.2976, 18.6766, 50.0, true},
                {"Stacja testowa Zabrze DK88", 50.3005, 18.7930, 100.0, true},
                {"Stacja testowa Bytom Centrum", 50.3480, 18.9157, 22.0, true},
                {"Stacja testowa Sosnowiec Centrum", 50.2787, 19.1270, 50.0, true},
                {"Stacja testowa Tychy Centrum", 50.1245, 18.9836, 50.0, true},
                {"Stacja testowa Rybnik Centrum", 50.0955, 18.5419, 100.0, true},
                {"Stacja testowa Dąbrowa Górnicza", 50.3249, 19.1875, 22.0, true},
                {"Stacja testowa Chorzów Centrum", 50.2966, 18.9545, 50.0, false},
                {"Stacja testowa Ruda Śląska", 50.2585, 18.8560, 150.0, true},
                {"Stacja testowa Częstochowa", 50.8118, 19.1203, 150.0, true},
                {"Stacja testowa Myszków", 50.5748, 19.3225, 50.0, true},
                {"Stacja testowa Zawiercie", 50.4877, 19.4170, 50.0, true},
                {"Stacja testowa Tarnowskie Góry", 50.4455, 18.8615, 100.0, true},
                {"Stacja testowa Lubliniec", 50.6683, 18.6840, 50.0, true},
                {"Stacja testowa Pszczyna", 49.9783, 18.9445, 100.0, true},
                {"Stacja testowa Bielsko-Biała", 49.8224, 19.0444, 150.0, true},
                {"Stacja testowa Żywiec", 49.6892, 19.2060, 50.0, true},
                {"Stacja testowa Cieszyn", 49.7497, 18.6325, 50.0, true},
                {"Stacja testowa Jastrzębie-Zdrój", 49.9506, 18.5915, 22.0, true},
                {"Stacja testowa Wodzisław Śląski", 50.0037, 18.4614, 50.0, true},
                {"Stacja testowa Racibórz", 50.0919, 18.2192, 100.0, true}
        };

        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        List<ChargingStation> stations = new ArrayList<>();
        for (Object[] data : stationData) {
            ChargingStation station = new ChargingStation();
            station.setName((String) data[0]);
            station.setPowerKW((Double) data[3]);
            station.setIsAvailable((Boolean) data[4]);
            station.setLocation(geometryFactory.createPoint(new Coordinate((Double) data[2], (Double) data[1])));
            stations.add(station);
        }
        chargingStationRepository.saveAll(stations);
    }

    private User seedManager() {
        return userRepository.save(User.builder()
                .firstName("Menedżer")
                .lastName("Testowy")
                .email("manager@evfleet.com")
                .password(passwordEncoder.encode(TEST_PASSWORD))
                .role(Role.MANAGER)
                .build());
    }

    // Dane pokazowe: dwie zakończone trasy w historii kierowcy i jedno zlecenie czekające na rozpoczęcie
    private void seedRoutes() {
        Optional<User> historyDriver = userRepository.findByEmail("kierowca1@evfleet.com");
        Optional<Vehicle> historyVehicle = findVehicle("SK 2000VAN");
        if (historyDriver.isPresent() && historyVehicle.isPresent()) {
            routeEntityRepository.save(sampleRoute(historyDriver.get(), historyVehicle.get(), "Katowice", RouteEntity.STATUS_FINISHED,
                    "Baza Katowice", 50.2649, 19.0238, "Gliwice, Rynek", 50.2945, 18.6714, 27.9, LocalDateTime.now().minusDays(2), 31));
            routeEntityRepository.save(sampleRoute(historyDriver.get(), historyVehicle.get(), "Katowice", RouteEntity.STATUS_FINISHED,
                    "Baza Katowice", 50.2649, 19.0238, "Tychy, Rynek", 50.1245, 18.9836, 19.4, LocalDateTime.now().minusDays(1), 24));
        }

        Optional<User> assignedDriver = userRepository.findByEmail("kierowca13@evfleet.com");
        Optional<Vehicle> assignedVehicle = findVehicle("SR 2600VAN");
        if (assignedDriver.isPresent() && assignedVehicle.isPresent()
                && assignedVehicle.get().getStatus() == VehicleStatus.DOSTEPNY) {
            RouteEntity route = routeEntityRepository.save(sampleRoute(assignedDriver.get(), assignedVehicle.get(), "Rybnik", RouteEntity.STATUS_ASSIGNED,
                    "Baza Rybnik", 50.0971, 18.5413, "Wodzisław Śląski, Rynek", 50.0037, 18.4614, 17.6, null, 0));

            assignedVehicle.get().setStatus(VehicleStatus.W_TRASIE);
            vehicleRepository.save(assignedVehicle.get());

            DriverNotification notification = new DriverNotification();
            notification.setEmployeeId(route.getEmployeeId());
            notification.setRouteId(route.getId());
            notification.setVehicleRegistration(route.getVehicleRegistrationNumber());
            notification.setDescription("Zlecono Ci nową trasę: " + route.getStartAddress() + " → " + route.getEndAddress());
            driverNotificationRepository.save(notification);
        }
    }

    private RouteEntity sampleRoute(User driver, Vehicle vehicle, String returnBase, String status,
                                    String startAddress, double startLat, double startLng,
                                    String endAddress, double endLat, double endLng,
                                    double distanceKm, LocalDateTime startedAt, int drivingMinutes) {
        RouteEntity route = new RouteEntity();
        route.setEmployeeId(String.valueOf(driver.getId()));
        route.setVehicleId(vehicle.getId());
        route.setVehicleRegistrationNumber(vehicle.getRegistrationNumber());
        route.setStartAddress(startAddress);
        route.setStartLat(startLat);
        route.setStartLng(startLng);
        route.setEndAddress(endAddress);
        route.setEndLat(endLat);
        route.setEndLng(endLng);
        route.setDistanceKm(distanceKm);
        route.setEnergyRequiredKWh(distanceKm * 0.22);
        route.setVehicleRangeKm(150.0);
        route.setReturnBaseName(returnBase);
        route.setStatus(status);
        if (startedAt != null) {
            route.setStartedAt(startedAt);
            route.setArrivedAt(startedAt.plusMinutes(drivingMinutes));
        }
        return route;
    }

    private Optional<Vehicle> findVehicle(String registrationNumber) {
        return vehicleRepository.findAll().stream()
                .filter(vehicle -> registrationNumber.equals(vehicle.getRegistrationNumber()))
                .findFirst();
    }

    private void seedReports() {
        userRepository.findByEmail("kierowca1@evfleet.com").ifPresent(driver -> reportRepository.save(Report.builder()
                .description("Kontrolka ciśnienia w oponach świeci się po dłuższej jeździe.")
                .type(Report.TYPE_ISSUE)
                .employeeId(String.valueOf(driver.getId()))
                .vehicleRegistration("SK 2000VAN")
                .createdAt(LocalDateTime.now().minusDays(1))
                .build()));
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
        for (Object[] data : baseData) {
            BaseLocation base = new BaseLocation();
            base.setName((String) data[0]);
            base.setLatitude((Double) data[1]);
            base.setLongitude((Double) data[2]);
            bases.add(base);
        }

        baseLocationRepository.saveAll(bases);
    }

    private void seedVehicles() {
        String[] bases = {
                "Katowice", "Gliwice", "Zabrze", "Bytom",
                "Sosnowiec", "Tychy", "Rybnik", "Dąbrowa Górnicza",
                "Chorzów", "Ruda Śląska"
        };

        String[] plates = {"SK", "SG", "SZ", "SY", "SO", "ST", "SR", "SD", "SH", "SL"};

        Object[][] luxuryCars = {
                {"Tesla Model S Plaid", 100.0}, {"Mercedes EQS 450+", 108.4},
                {"Porsche Taycan 4S", 93.4}, {"Audi RS e-tron GT", 93.4},
                {"BMW i7 xDrive60", 101.7}, {"Lucid Air Grand Touring", 112.0},
                {"Tesla Model X", 100.0}, {"Mercedes EQE 350", 90.6},
                {"Porsche Taycan Turbo", 93.4}, {"BMW iX xDrive50", 105.2}
        };

        Object[][] smallVans = {
                {"Renault Kangoo Van E-Tech", 45.0}, {"Nissan Townstar EV", 44.0},
                {"Peugeot e-Partner", 50.0}, {"Citroen e-Berlingo Van", 50.0},
                {"Opel Combo-e Cargo", 50.0}, {"Toyota Proace City Electric", 50.0},
                {"Fiat E-Doblo", 50.0}, {"Renault Kangoo Maxi Z.E.", 33.0},
                {"Nissan e-NV200", 40.0}, {"Maxus eDeliver 3", 50.2}
        };

        Object[][] largeVans = {
                {"Ford E-Transit", 68.0}, {"Mercedes eSprinter", 113.0},
                {"Fiat E-Ducato", 79.0}, {"Renault Master E-Tech", 52.0},
                {"Volkswagen e-Crafter", 35.8}, {"Maxus eDeliver 9", 88.5},
                {"Peugeot e-Boxer", 70.0}, {"Citroen e-Jumper", 70.0},
                {"Opel Movano-e", 70.0}, {"Iveco eDaily", 111.0}
        };

        List<Vehicle> fleet = new ArrayList<>();

        for (int i = 0; i < 10; i++) {
            String base = bases[i];
            String platePrefix = plates[i];

            fleet.add(createVehicle(
                    platePrefix + " 1" + i + "00VIP",
                    (String) luxuryCars[i][0],
                    (Double) luxuryCars[i][1],
                    base,
                    1500.0 + (i * 200),
                    VehicleType.OSOBOWY
            ));

            fleet.add(createVehicle(
                    platePrefix + " 2" + i + "00VAN",
                    (String) smallVans[i][0],
                    (Double) smallVans[i][1],
                    base,
                    12500.0 + (i * 1500),
                    VehicleType.MALY_DOSTAWCZAK
            ));

            fleet.add(createVehicle(
                    platePrefix + " 3" + i + "00TRK",
                    (String) largeVans[i][0],
                    (Double) largeVans[i][1],
                    base,
                    25000.0 + (i * 3000),
                    VehicleType.DUZY_DOSTAWCZAK
            ));
        }

        vehicleRepository.saveAll(fleet);
    }

    private Vehicle createVehicle(String registration, String model, Double battery, String base, Double mileage, VehicleType type) {
        Vehicle v = new Vehicle();
        v.setRegistrationNumber(registration);
        v.setModel(model);
        v.setBatteryCapacityKWh(battery);
        v.setStateOfCharge(75 + (int)(Math.random() * 26));
        v.setStatus(VehicleStatus.DOSTEPNY);
        v.setIsBlocked(false);
        v.setTotalMileage(mileage);
        v.setCurrentBase(base);
        v.setVehicleType(type);
        return v;
    }

    // === GENEROWANIE 20 KIEROWCÓW Z PRZYPISANYM ID BAZY (baseId) ===
    private void seedDrivers() {
        String[] bases = {
                "Katowice", "Gliwice", "Zabrze", "Bytom",
                "Sosnowiec", "Tychy", "Rybnik", "Dąbrowa Górnicza",
                "Chorzów", "Ruda Śląska"
        };

        Map<String, Long> baseIds = baseLocationRepository.findAll().stream()
                .collect(Collectors.toMap(BaseLocation::getName, BaseLocation::getId));

        List<User> drivers = new ArrayList<>();
        String encodedPassword = passwordEncoder.encode(TEST_PASSWORD);

        int driverCounter = 1;
        for (int i = 0; i < bases.length; i++) {
            String baseName = bases[i];
            Long baseId = baseIds.get("Baza " + baseName);

            for (int j = 1; j <= 2; j++) {
                String email = "kierowca" + driverCounter + "@evfleet.com";

                if (userRepository.findByEmail(email).isEmpty()) {
                    User driver = User.builder()
                            .firstName("Kierowca" + driverCounter)
                            .lastName(baseName)
                            .email(email)
                            .password(encodedPassword)
                            .role(Role.DRIVER)
                            .baseId(baseId)
                            .lastRoute("Brak aktywnej trasy")
                            .build();

                    drivers.add(driver);
                }
                driverCounter++;
            }
        }

        userRepository.saveAll(drivers);
    }
}