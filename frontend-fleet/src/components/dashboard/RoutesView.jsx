import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Paper, Alert, Divider } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

export default function RoutesView({
                                       bases = [],
                                       onRoutePlanned,
                                       routePath = [],
                                       routeWaypoints = { start: null, end: null, stops: [] },
                                       routeResult = null
                                   }) {
    const [startBase, setStartBase] = useState('');
    const [cargoType, setCargoType] = useState('');
    const [destination, setDestination] = useState('');
    const [localMessage, setLocalMessage] = useState({ text: '', type: 'info' });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Walidacja lokalna przed wysłaniem
        if (!startBase || !cargoType || !destination) {
            setLocalMessage({ text: 'Wypełnij wszystkie pola formularza trasy.', type: 'warning' });
            return;
        }

        // Podpowiedź / zabezpieczenie dla samej ulicy
        if (!destination.includes(',')) {
            setLocalMessage({
                text: 'Wskazówka: Wpisz nazwę miasta razem z ulicą (np. "Warszawa, Marszałkowska"), aby wyszukiwarka OpenStreetMap poprawnie znalazła adres.',
                type: 'info'
            });
        } else {
            setLocalMessage({ text: '', type: 'info' });
        }

        if (onRoutePlanned) {
            onRoutePlanned({ startBase, cargoType, destination });
        }
    };

    // Domyślne centrum (np. Katowice) lub punkt startowy trasy
    const centerLat = routeWaypoints.start?.lat || 50.2649;
    const centerLng = routeWaypoints.start?.lng || 19.0238;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 4 }}>

            {/* Górna sekcja: Formularz, komunikaty i podsumowanie trasy */}
            <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    🧭 Planowanie Trasy i Nawigacja Floty EV
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Wybierz bazę startową, rodzaj ładunku (system dobierze pojazd) oraz cel podróży.
                </Typography>

                {/* Wyświetlanie lokalnych komunikatów / ostrzeżeń */}
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
                        onChange={(e) => setStartBase(e.target.value)}
                        required
                        size="small"
                        sx={{ minWidth: 220, flexGrow: 1 }}
                    >
                        {bases.map((base, index) => (
                            <MenuItem key={index} value={base.name || base}>
                                {base.name || base}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Rodzaj ładunku / przeznaczenia"
                        value={cargoType}
                        onChange={(e) => setCargoType(e.target.value)}
                        required
                        size="small"
                        sx={{ minWidth: 260, flexGrow: 1 }}
                    >
                        <MenuItem value="OSOBOWY">🚗 Przewóz osób (Auta osobowe / VIP)</MenuItem>
                        <MenuItem value="MALY_DOSTAWCZAK">📦 Przewóz małych paczek (Małe vany)</MenuItem>
                        <MenuItem value="DUZY_DOSTAWCZAK">🚛 Przewóz dużych paczek (Duże vany)</MenuItem>
                    </TextField>

                    <TextField
                        label="Miejsce docelowe"
                        placeholder="np. Warszawa, ul. Marszałkowska"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                        size="small"
                        sx={{ minWidth: 260, flexGrow: 1 }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="medium"
                        sx={{ py: 1, px: 3, minWidth: 180 }}
                    >
                        🚀 Wyznacz trasę
                    </Button>
                </Box>

                {/* Wyświetlenie wyników obliczonej trasy pod formularzem */}

                {routeResult && (
                    <Box sx={{ mt: 1, p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="success.main" sx={{ width: '100%' }}>
                            ✅ Trasa wyznaczona pomyślnie
                        </Typography>
                        <Typography variant="body2">
                            <b>Dystans:</b> {routeResult.routes?.[0]?.distance ? (routeResult.routes[0].distance / 1000).toFixed(2) : '0'} km
                        </Typography>
                        <Typography variant="body2">
                            <b>Szacowany czas:</b> {routeResult.routes?.[0]?.duration ? Math.round(routeResult.routes[0].duration / 60) : '0'} min
                        </Typography>
                        <Typography variant="body2">
                            <b>Szacowana energia:</b> {routeResult.energyRequiredKWh?.toFixed(1) || ((routeResult.routes?.[0]?.distance ? routeResult.routes[0].distance / 1000 : 50) * 0.18).toFixed(1)} kWh
                        </Typography>
                        <Typography variant="body2">
                            <b>Zasięg pojazdu:</b> {routeResult.vehicleRangeKm || 300} km
                        </Typography>
                        {routeResult.chargingStops?.length > 0 && (
                            <Typography variant="body2" color="warning.dark">
                                ⚡ Liczba przystanków na ładowanie: <b>{routeResult.chargingStops.length}</b>
                            </Typography>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Dolna sekcja: Mapa wyświetlająca się POD SPODEM */}
            <Paper elevation={3} sx={{ width: '100%', height: '550px', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                <MapContainer center={[centerLat, centerLng]} zoom={7} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {/* Bazy floty */}
                    {bases.map((baza, idx) => (
                        baza.latitude && baza.longitude && (
                            <Marker key={`base-${idx}`} position={[baza.latitude, baza.longitude]}>
                                <Popup>
                                    <strong>Baza: {baza.name || baza}</strong>
                                </Popup>
                            </Marker>
                        )
                    ))}

                    {/* Linia trasy (Polyline) */}
                    {routePath && routePath.length > 0 && (
                        <Polyline positions={routePath} color="#1976d2" weight={5} opacity={0.8} />
                    )}

                    {/* Punkt Startowy */}
                    {routeWaypoints.start && (
                        <Marker position={[routeWaypoints.start.lat, routeWaypoints.start.lng]}>
                            <Popup>
                                <strong>Start:</strong> {routeWaypoints.start.name}
                            </Popup>
                        </Marker>
                    )}

                    {/* Przystanki / Stacje ładowania na trasie */}
                    {routeWaypoints.stops && routeWaypoints.stops.map((stop, index) => (
                        <Marker key={`route-stop-${index}`} position={[stop.lat, stop.lng]}>
                            <Popup>
                                <strong>Przystanek ładowania:</strong> {stop.name || `Stacja ${index + 1}`}
                            </Popup>
                        </Marker>
                    ))}

                    {/* Punkt Docelowy */}
                    {routeWaypoints.end && (
                        <Marker position={[routeWaypoints.end.lat, routeWaypoints.end.lng]}>
                            <Popup>
                                <strong>Cel:</strong> {routeWaypoints.end.name}
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </Paper>
        </Box>
    );
}