import React, { useEffect, useState } from 'react';
import {
    Box, TextField, Button, MenuItem, Typography, Paper, Alert, Divider, Chip,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

function RouteStatusChip({ route }) {
    if (route.status === 'ZLECONA') return <Chip size="small" color="warning" label="Oczekuje na rozpoczęcie" />;
    if (route.arrivedAt) return <Chip size="small" color="info" label="Powrót do bazy" />;
    return <Chip size="small" color="success" label="W trasie" />;
}

export default function RoutesView({
                                       bases = [],
                                       drivers = [], // Lista kierowców przekazana z Dashboard
                                       onRoutePlanned,
                                       routePath = [],
                                       routeWaypoints = { start: null, end: null, stops: [] },
                                       routeResult = null,
                                       message = { text: '', type: 'info' },
                                       setMessage,
                                       onRouteAssigned
                                   }) {
    const [startBase, setStartBase] = useState('');
    const [cargoType, setCargoType] = useState('');
    const [destination, setDestination] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(''); // Wybrany kierowca
    const [localMessage, setLocalMessage] = useState({ text: '', type: 'info' });
    const [assigning, setAssigning] = useState(false);
    // Znacznik jest częścią trasy w Dashboard, bo ten komponent jest odmontowywany przy zmianie zakładki
    const isRouteAssigned = Boolean(routeResult?.assigned);
    const [activeRoutes, setActiveRoutes] = useState([]);

    const fetchActiveRoutes = async () => {
        try {
            const response = await fetch('/api/routes/active', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) setActiveRoutes(await response.json());
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchActiveRoutes();
        // Statusy zmieniają kierowcy, więc lista odświeża się sama
        const intervalId = setInterval(fetchActiveRoutes, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const getDriverLabel = (employeeId) => {
        const driver = drivers.find(d => String(d.id) === String(employeeId));
        return driver?.firstName ? `${driver.firstName} ${driver.lastName}` : `ID: ${employeeId}`;
    };

    const handleCancelRoute = async (routeId) => {
        try {
            const response = await fetch(`/api/routes/${routeId}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                setLocalMessage({ text: 'Zlecenie anulowane, pojazd jest znów dostępny.', type: 'success' });
            } else {
                setLocalMessage({ text: `Nie udało się anulować zlecenia: ${await response.text()}`, type: 'error' });
            }
            fetchActiveRoutes();
        } catch (err) {
            console.error(err);
            setLocalMessage({ text: 'Błąd połączenia z serwerem.', type: 'error' });
        }
    };

    // --- DIAGNOSTYKA W KONSOLI (F12) ---
    console.log("Wszyscy kierowcy w RoutesView:", drivers);
    console.log("Wybrana baza w select:", startBase);
    console.log("Dostępne bazy:", bases);

    // Dokładne filtrowanie kierowców po baseId
    const filteredDrivers = drivers.filter(drv => {
        if (!startBase) return false;

        // Znajdujemy pełny obiekt wybranej bazy z tablicy bases po jej nazwie
        const selectedBaseObj = bases.find(b => (b.name || b) === startBase);
        if (!selectedBaseObj) return false;

        // Pobieramy ID wybranej bazy (z obiektu bazy lub jej indeksu + 1)
        const selectedBaseId = selectedBaseObj.id || (bases.indexOf(selectedBaseObj) + 1);

        console.log(`Porównanie -> Kierowca ID: ${drv.id}, Jego baseId: ${drv.baseId} | Wybrane ID bazy: ${selectedBaseId}`);

        // Porównujemy ID bazy kierowcy z ID wybranej bazy
        return Number(drv.baseId) === Number(selectedBaseId);
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!startBase || !cargoType || !destination) {
            setLocalMessage({ text: 'Wypełnij wszystkie pola formularza trasy.', type: 'warning' });
            return;
        }

        if (!destination.includes(',')) {
            setLocalMessage({
                text: 'Wskazówka: Wpisz nazwę miasta razem z ulicą (np. "Warszawa, Marszałkowska").',
                type: 'info'
            });
        } else {
            setLocalMessage({ text: '', type: 'info' });
        }

        if (onRoutePlanned) {
            onRoutePlanned({ startBase, cargoType, destination });
        }
    };

    // Funkcja przypisująca wyznaczoną trasę do kierowcy
    const handleAssignRoute = async () => {
        if (!selectedDriver) {
            setLocalMessage({ text: 'Wybierz kierowcę, któremu chcesz zlecić trasę.', type: 'warning' });
            return;
        }
        if (!routeResult) {
            setLocalMessage({ text: 'Najpierw wyznacz trasę przed jej przypisaniem.', type: 'warning' });
            return;
        }
        if (routeWaypoints.start?.name !== startBase) {
            setLocalMessage({ text: 'Wybrana baza różni się od bazy wyznaczonej trasy. Wyznacz trasę ponownie.', type: 'warning' });
            return;
        }

        setAssigning(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/routes/assign-to-driver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    employeeId: String(selectedDriver),
                    vehicleId: routeResult.assignedVehicleId,
                    vehicleRegistrationNumber: routeResult.vehicleRegistrationNumber,
                    // Adresy z wyznaczonej trasy, bo pola formularza mogły się od tego czasu zmienić
                    startAddress: routeWaypoints.start?.name,
                    endAddress: routeWaypoints.end?.name,
                    distanceKm: routeResult.distanceKm,
                    energyRequiredKWh: routeResult.energyRequiredKWh,
                    vehicleRangeKm: routeResult.vehicleRangeKm,
                    returnBaseName: routeResult.returnBaseName,
                    startLat: routeWaypoints.start?.lat,
                    startLng: routeWaypoints.start?.lng,
                    endLat: routeWaypoints.end?.lat,
                    endLng: routeWaypoints.end?.lng,
                    chargingStopLat: routeWaypoints.stops?.[0]?.lat,
                    chargingStopLng: routeWaypoints.stops?.[0]?.lng,
                    chargingStopName: routeWaypoints.stops?.[0]?.name
                })
            });

            if (response.ok) {
                onRouteAssigned?.();
                fetchActiveRoutes();
                setLocalMessage({ text: `Trasa została zlecona kierowcy (ID: ${selectedDriver}). Otrzyma powiadomienie po zalogowaniu.`, type: 'success' });
            } else {
                const errText = await response.text();
                setLocalMessage({ text: `Błąd podczas zlecania trasy: ${errText}`, type: 'error' });
            }
        } catch (err) {
            setLocalMessage({ text: 'Błąd połączenia z serwerem.', type: 'error' });
        } finally {
            setAssigning(false);
        }
    };

    const centerLat = routeWaypoints.start?.lat || 50.2649;
    const centerLng = routeWaypoints.start?.lng || 19.0238;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 4 }}>

            {/* Górna sekcja: Formularz, wybór kierowcy i podsumowanie */}
            <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    🧭 Planowanie Trasy i Zlecanie Kierowcom
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Wybierz bazę startową, rodzaj ładunku, cel podróży oraz wskaż kierowcę z danej bazy, któremu powierzysz kurs.
                </Typography>

                {message.text && (
                    <Alert severity={message.type} onClose={() => setMessage?.({ text: '', type: 'info' })}>
                        {message.text}
                    </Alert>
                )}

                {localMessage.text && (
                    <Alert severity={localMessage.type} onClose={() => setLocalMessage({ text: '', type: 'info' })}>
                        {localMessage.text}
                    </Alert>
                )}

                <Divider />

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <TextField
                        select
                        label="Baza startowa"
                        value={startBase}
                        onChange={(e) => {
                            setStartBase(e.target.value);
                            setSelectedDriver(''); // Resetujemy wybranego kierowcę przy zmianie bazy
                        }}
                        required
                        size="small"
                        sx={{ minWidth: 200, flexGrow: 1 }}
                    >
                        {bases.map((base, index) => (
                            <MenuItem key={index} value={base.name || base}>
                                {base.name || base}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Rodzaj ładunku / pojazdu"
                        value={cargoType}
                        onChange={(e) => setCargoType(e.target.value)}
                        required
                        size="small"
                        sx={{ minWidth: 220, flexGrow: 1 }}
                    >
                        <MenuItem value="OSOBOWY">🚗 Przewóz osób (Osobowe)</MenuItem>
                        <MenuItem value="MALY_DOSTAWCZAK">📦 Małe paczki (Małe vany)</MenuItem>
                        <MenuItem value="DUZY_DOSTAWCZAK">🚛 Duże paczki (Duże vany)</MenuItem>
                    </TextField>

                    <TextField
                        label="Miejsce docelowe"
                        placeholder="np. Warszawa, ul. Marszałkowska"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                        size="small"
                        sx={{ minWidth: 220, flexGrow: 1 }}
                    />

                    {/* Przefiltrowane pole wyboru kierowcy */}
                    <TextField
                        select
                        label={startBase ? "Przypisz kierowcę z bazy" : "Najpierw wybierz bazę"}
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        required
                        size="small"
                        disabled={!startBase} // Zablokowane, dopóki nie wybrano bazy
                        sx={{ minWidth: 200, flexGrow: 1 }}
                    >
                        {filteredDrivers.length > 0 ? (
                            filteredDrivers.map((drv, idx) => (
                                <MenuItem key={idx} value={drv.id}>
                                    {drv.firstName && drv.lastName
                                        ? `${drv.firstName} ${drv.lastName}`
                                        : drv.username || drv.email || `Kierowca (${drv.id})`}
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled value="">
                                {startBase ? "Brak kierowców w tej bazie" : "Wybierz najpierw bazę startową"}
                            </MenuItem>
                        )}
                    </TextField>

                    <Button
                        type="submit"
                        variant="contained"
                        size="medium"
                        sx={{ py: 1, px: 3 }}
                    >
                        🚀 Wyznacz trasę
                    </Button>
                </Box>

                {/* Wyniki wyznaczonej trasy oraz opcja zatwierdzenia zlecenia */}
                {routeResult && (
                    <Box sx={{ mt: 1, p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                                    ✅ Trasa wyznaczona pomyślnie
                                </Typography>
                                <Typography variant="body2"><b>Dystans:</b> {routeResult.distanceKm?.toFixed(1)} km</Typography>
                                <Typography variant="body2"><b>Energia:</b> {routeResult.energyRequiredKWh?.toFixed(1) || '10.0'} kWh</Typography>
                                <Typography variant="body2"><b>Pojazd:</b> {routeResult.vehicleRegistrationNumber || 'Dobrany automatycznie'}</Typography>
                            </Box>

                            <Button
                                variant="contained"
                                color="success"
                                size="large"
                                onClick={handleAssignRoute}
                                disabled={assigning || !selectedDriver || isRouteAssigned}
                                sx={{ px: 4, py: 1.5, fontWeight: 'bold' }}
                            >
                                {isRouteAssigned ? '✅ Trasa zlecona' : assigning ? 'Zlecanie...' : '📋 Zleć tę trasę kierowcy'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>

            {activeRoutes.length > 0 && (
                <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
                    <Typography variant="h6" gutterBottom>Aktywne zlecenia</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Kierowca</strong></TableCell>
                                    <TableCell><strong>Trasa</strong></TableCell>
                                    <TableCell><strong>Pojazd</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell align="right"><strong>Akcje</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {activeRoutes.map((route) => (
                                    <TableRow key={route.id}>
                                        <TableCell>{getDriverLabel(route.employeeId)}</TableCell>
                                        <TableCell>{route.startAddress} → {route.endAddress}</TableCell>
                                        <TableCell>{route.vehicleRegistrationNumber}</TableCell>
                                        <TableCell><RouteStatusChip route={route} /></TableCell>
                                        <TableCell align="right">
                                            {route.status === 'ZLECONA' && (
                                                <Button size="small" color="error" variant="outlined" onClick={() => handleCancelRoute(route.id)}>
                                                    Anuluj
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Dolna sekcja: Mapa */}
            <Paper elevation={3} sx={{ width: '100%', height: '550px', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                <MapContainer center={[centerLat, centerLng]} zoom={7} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {bases.map((baza, idx) => (
                        baza.latitude && baza.longitude && (
                            <Marker key={`base-${idx}`} position={[baza.latitude, baza.longitude]}>
                                <Popup><strong>Baza: {baza.name || baza}</strong></Popup>
                            </Marker>
                        )
                    ))}

                    {routePath && routePath.length > 0 && (
                        <Polyline positions={routePath} color="#1976d2" weight={5} opacity={0.8} />
                    )}

                    {routeWaypoints.start && (
                        <Marker position={[routeWaypoints.start.lat, routeWaypoints.start.lng]}>
                            <Popup><strong>Start:</strong> {routeWaypoints.start.name}</Popup>
                        </Marker>
                    )}

                    {routeWaypoints.stops && routeWaypoints.stops.map((stop, index) => (
                        <Marker key={`route-stop-${index}`} position={[stop.lat, stop.lng]}>
                            <Popup><strong>Przystanek ładowania:</strong> {stop.name || `Stacja ${index + 1}`}</Popup>
                        </Marker>
                    ))}

                    {routeWaypoints.end && (
                        <Marker position={[routeWaypoints.end.lat, routeWaypoints.end.lng]}>
                            <Popup><strong>Cel:</strong> {routeWaypoints.end.name}</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </Paper>
        </Box>
    );
}