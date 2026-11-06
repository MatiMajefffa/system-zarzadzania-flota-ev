import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Button, List,
    ListItem, ListItemIcon, ListItemText, TextField, Paper, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    MenuItem, Select, FormControl, InputLabel, Grid
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import LogoutIcon from '@mui/icons-material/Logout';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const drawerWidth = 240;

// Kontroler wyśrodkowania dla mapy głównej
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat && center.lng) {
            map.flyTo([center.lat, center.lng], 12);
        }
    }, [center, map]);
    return null;
}

// NOWY: Kontroler dopasowujący widok do całej trasy
function RouteBoundsController({ waypoints }) {
    const map = useMap();
    useEffect(() => {
        if (waypoints && waypoints.start && waypoints.end) {
            const bounds = L.latLngBounds([
                [waypoints.start.lat, waypoints.start.lng],
                [waypoints.end.lat, waypoints.end.lng]
            ]);
            if (waypoints.stops) {
                waypoints.stops.forEach(s => bounds.extend([s.lat, s.lng]));
            }
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [waypoints, map]);
    return null;
}

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('mapa');
    const [stations, setStations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: 'info' });
    const [radiusKm, setRadiusKm] = useState(15);
    const [centerCoords, setCenterCoords] = useState({ lat: 50.2649, lng: 19.0238 });
    const [searchAddress, setSearchAddress] = useState('Katowice');
    const [isAuthenticated, setIsAuthenticated] = useState(true);

    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
        registrationNumber: '',
        model: '',
        batteryCapacityKWh: '',
        stateOfCharge: '',
        status: 'DOSTEPNY'
    });

    const [routeForm, setRouteForm] = useState({
        vehicleId: '',
        startAddress: '',
        endAddress: ''
    });

    const [routeResult, setRouteResult] = useState(null);
    // STANY DO RYSOWANIA TRASY:
    const [routePath, setRoutePath] = useState([]); // Geometria drogi
    const [routeWaypoints, setRouteWaypoints] = useState({ start: null, end: null, stops: [] }); // Punkty na mapie

    const token = localStorage.getItem('token');
    const employeeId = localStorage.getItem('employeeId');

    useEffect(() => {
        if (!token || token === 'undefined' || token === 'null') {
            setIsAuthenticated(false);
        } else {
            fetchStations();
            fetchVehicles();
        }
    }, [token]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('employeeId');
        window.location.href = '/login';
    };

    if (!isAuthenticated) {
        window.location.href = '/login';
        return null;
    }

    const showMessage = (text, type = 'info', timeout = 5000) => {
        setMessage({ text, type });
        if (timeout) {
            setTimeout(() => setMessage({ text: '', type: 'info' }), timeout);
        }
    };

    const fetchStations = async () => {
        try {
            const response = await fetch('/api/charging-stations', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                setStations(await response.json());
            } else if (response.status === 401 || response.status === 403) {
                handleLogout();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        showMessage('Pobieranie stacji z OpenChargeMap...', 'info');
        try {
            const response = await fetch('/api/charging-stations/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const count = await response.json();
                showMessage(`Zapisano w PostGIS stacji: ${count}`, 'success');
                fetchStations();
            } else {
                showMessage('Błąd synchronizacji stacji.', 'error');
            }
        } catch (err) {
            showMessage('Błąd połączenia z serwerem.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchByAddress = async () => {
        if (!searchAddress.trim()) return;
        setLoading(true);
        showMessage(`Szukanie lokalizacji "${searchAddress}"...`, 'info');

        try {
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress + ', Polska')}&limit=1`;
            const geocodeResponse = await fetch(geocodeUrl);
            const geocodeData = await geocodeResponse.json();

            if (geocodeData && geocodeData.length > 0) {
                const lat = parseFloat(geocodeData[0].lat);
                const lng = parseFloat(geocodeData[0].lon);
                setCenterCoords({ lat, lng });

                const response = await fetch(
                    `/api/charging-stations/nearby?latitude=${lat}&longitude=${lng}&radiusKm=${radiusKm}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (response.ok) {
                    const data = await response.json();
                    setStations(data);
                    showMessage(`Znaleziono ${data.length} stacji w promieniu ${radiusKm} km`, 'success');
                } else {
                    showMessage(`Błąd serwera (Status ${response.status}).`, 'error');
                }
            } else {
                showMessage('Nie znaleziono podanego miasta.', 'warning');
            }
        } catch (err) {
            showMessage('Błąd połączenia z serwerem geokodowania.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                setVehicles(await response.json());
            }
        } catch (err) {
            console.error('Błąd pobierania pojazdów:', err);
        }
    };

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            registrationNumber: newVehicle.registrationNumber,
            model: newVehicle.model,
            batteryCapacityKWh: parseFloat(newVehicle.batteryCapacityKWh),
            stateOfCharge: parseInt(newVehicle.stateOfCharge, 10),
            status: newVehicle.status
        };

        try {
            const response = await fetch('/api/vehicles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showMessage('Pojazd został pomyślnie dodany do floty!', 'success');
                setNewVehicle({ registrationNumber: '', model: '', batteryCapacityKWh: '', stateOfCharge: '', status: 'DOSTEPNY' });
                setShowVehicleForm(false);
                fetchVehicles();
            } else {
                const errorData = await response.json().catch(() => null);
                showMessage(`Błąd: ${errorData ? JSON.stringify(errorData) : "Nieznany format błędu z serwera."}`, 'error', null);
            }
        } catch (err) {
            showMessage('Błąd połączenia z serwerem.', 'error', null);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // API: TRASY (Z OSRM API DLA RYSOWANIA DROGI)
    // ==========================================
    const handleCalculateRoute = async () => {
        if (!routeForm.vehicleId || !routeForm.startAddress || !routeForm.endAddress) {
            showMessage('Proszę wybrać pojazd oraz wpisać punkt startowy i docelowy.', 'warning');
            return;
        }

        setLoading(true);
        showMessage('Szukanie współrzędnych dla adresów na mapie...', 'info', null);
        setRouteResult(null);
        setRoutePath([]);
        setRouteWaypoints({ start: null, end: null, stops: [] });

        try {
            // 1. Geokodowanie Start i Koniec
            const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(routeForm.startAddress + ', Polska')}&limit=1`);
            const startData = await startRes.json();
            if (!startData || startData.length === 0) {
                showMessage(`Nie znaleziono adresu początkowego: ${routeForm.startAddress}`, 'error');
                setLoading(false); return;
            }
            const startLat = parseFloat(startData[0].lat);
            const startLon = parseFloat(startData[0].lon);

            const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(routeForm.endAddress + ', Polska')}&limit=1`);
            const endData = await endRes.json();
            if (!endData || endData.length === 0) {
                showMessage(`Nie znaleziono adresu końcowego: ${routeForm.endAddress}`, 'error');
                setLoading(false); return;
            }
            const endLat = parseFloat(endData[0].lat);
            const endLon = parseFloat(endData[0].lon);

            showMessage('Współrzędne pobrane. Obliczanie optymalnej trasy przez backend...', 'info', null);

            // 2. Zapytanie do Spring Boot (Twojego RouteController'a)
            const url = `/api/routes/plan?vehicleId=${routeForm.vehicleId}&startLat=${startLat}&startLon=${startLon}&endLat=${endLat}&endLon=${endLon}&temperature=15.0`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setRouteResult(data);

                // Zbieranie punktów postojów z backendu (jeśli stacje posiadają pole latitude i longitude)
                const stops = (data.chargingStops || []).filter(s => s.latitude && s.longitude).map(s => ({
                    lat: s.latitude, lng: s.longitude, name: s.stationName
                }));

                const startPoint = { lat: startLat, lng: startLon, name: routeForm.startAddress };
                const endPoint = { lat: endLat, lng: endLon, name: routeForm.endAddress };
                setRouteWaypoints({ start: startPoint, end: endPoint, stops });

                showMessage('Pobieranie geometrii drogi...', 'info', null);

                // 3. Pobranie dokładnej ścieżki (dróg) z OSRM na podstawie punktów z backendu
                try {
                    // OSRM przyjmuje format: lon,lat;lon,lat;lon,lat
                    const osrmCoords = [
                        `${startLon},${startLat}`,
                        ...stops.map(s => `${s.lng},${s.lat}`),
                        `${endLon},${endLat}`
                    ].join(';');

                    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;
                    const osrmRes = await fetch(osrmUrl);
                    const osrmData = await osrmRes.json();

                    if (osrmData.routes && osrmData.routes.length > 0) {
                        // Leaflet Polyline potrzebuje formatu [lat, lon], a GeoJSON zwraca [lon, lat]
                        const pathCoords = osrmData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        setRoutePath(pathCoords);
                    }
                } catch (osrmErr) {
                    console.error("Błąd generowania ścieżki z OSRM", osrmErr);
                    // Rysowanie prostej linii w razie awarii OSRM
                    setRoutePath([ [startLat, startLon], ...stops.map(s => [s.lat, s.lng]), [endLat, endLon] ]);
                }

                showMessage('Trasa została pomyślnie wyznaczona i narysowana na mapie!', 'success');
            } else {
                const errorData = await response.json().catch(() => null);
                showMessage(`Błąd backendu podczas wyznaczania trasy: ${errorData ? JSON.stringify(errorData) : 'Status ' + response.status}`, 'error', null);
            }
        } catch (err) {
            showMessage('Błąd połączenia z serwerem.', 'error', null);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // WIDOKI
    // ==========================================
    const renderMapTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" color="success" startIcon={<SyncIcon />} onClick={handleSync} disabled={loading}>
                    {loading ? 'Pobieranie...' : 'Pobierz Stacje (OCM)'}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <TextField size="small" label="Miasto / Adres" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchByAddress()} />
                <TextField size="small" label="Promień (km)" type="number" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} sx={{ width: 100 }} />
                <Button variant="contained" color="primary" startIcon={<SearchIcon />} onClick={handleSearchByAddress} disabled={loading}>
                    Szukaj
                </Button>
            </Paper>

            {message.text && <Alert severity={message.type}>{message.text}</Alert>}

            <Paper sx={{ flexGrow: 1, minHeight: '500px', borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer center={[centerCoords.lat, centerCoords.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={centerCoords} />
                    {stations.map((st) => (
                        st.latitude && st.longitude && (
                            <Marker key={st.id} position={[st.latitude, st.longitude]}>
                                <Popup>
                                    <strong>{st.name}</strong><br />
                                    Moc: {st.powerKW || 22} kW<br />
                                    Dostępność: {st.isAvailable ? 'Dostępna' : 'Zajęta'}<br />
                                    {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
            </Paper>
        </Box>
    );

    const renderVehiclesTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {message.text && <Alert severity={message.type} onClose={() => setMessage({text: ''})}>{message.text}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">Flota Pojazdów</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setShowVehicleForm(!showVehicleForm)}>
                    {showVehicleForm ? 'Anuluj' : 'Dodaj Pojazd'}
                </Button>
            </Box>

            {showVehicleForm && (
                <Paper sx={{ p: 3, backgroundColor: '#fdfdfd' }} elevation={2}>
                    <Typography variant="h6" gutterBottom>Nowy Pojazd EV</Typography>
                    <Box component="form" onSubmit={handleAddVehicle} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField required label="Nr rejestracyjny" size="small" value={newVehicle.registrationNumber} onChange={(e) => setNewVehicle({...newVehicle, registrationNumber: e.target.value})} />
                        <TextField required label="Model" size="small" value={newVehicle.model} onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})} />
                        <TextField required label="Bateria (kWh)" type="number" size="small" slotProps={{ htmlInput: { step: "0.1", min: "0.1" } }} value={newVehicle.batteryCapacityKWh} onChange={(e) => setNewVehicle({...newVehicle, batteryCapacityKWh: e.target.value})} />
                        <TextField required label="Naładowanie (%)" type="number" size="small" slotProps={{ htmlInput: { min: "0", max: "100" } }} value={newVehicle.stateOfCharge} onChange={(e) => setNewVehicle({...newVehicle, stateOfCharge: e.target.value})} />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={newVehicle.status} label="Status" onChange={(e) => setNewVehicle({...newVehicle, status: e.target.value})}>
                                <MenuItem value="DOSTEPNY">Dostępny</MenuItem>
                                <MenuItem value="W_TRASIE">W trasie</MenuItem>
                                <MenuItem value="LADUJE_SIE">Ładuje się</MenuItem>
                                <MenuItem value="SERWIS">Serwis</MenuItem>
                            </Select>
                        </FormControl>
                        <Button type="submit" variant="contained" color="success" startIcon={<SaveIcon />} disabled={loading}>
                            Zapisz Pojazd
                        </Button>
                    </Box>
                </Paper>
            )}

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ backgroundColor: '#f0f2f5' }}>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Nr rejestracyjny</strong></TableCell>
                            <TableCell><strong>Model</strong></TableCell>
                            <TableCell><strong>Bateria (kWh)</strong></TableCell>
                            <TableCell><strong>Naładowanie (%)</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vehicles.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">Brak pojazdów w bazie danych.</TableCell></TableRow>
                        ) : (
                            vehicles.map((v) => (
                                <TableRow key={v.id} hover>
                                    <TableCell>{v.id}</TableCell>
                                    <TableCell>{v.registrationNumber}</TableCell>
                                    <TableCell>{v.model}</TableCell>
                                    <TableCell>{v.batteryCapacityKWh}</TableCell>
                                    <TableCell>{v.stateOfCharge}%</TableCell>
                                    <TableCell>{v.status}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    const renderRoutesTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5">Planowanie Tras i Optymalizacja</Typography>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Wyznacz nową trasę</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Wybierz pojazd</InputLabel>
                            <Select value={routeForm.vehicleId} label="Wybierz pojazd" onChange={(e) => setRouteForm({...routeForm, vehicleId: e.target.value})}>
                                {vehicles.length === 0 && <MenuItem value="" disabled>Brak pojazdów</MenuItem>}
                                {vehicles.map(v => (
                                    <MenuItem key={v.id} value={v.id}>
                                        {v.registrationNumber} - {v.model} ({v.stateOfCharge}%)
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" label="Punkt startowy (np. Katowice)" value={routeForm.startAddress} onChange={(e) => setRouteForm({...routeForm, startAddress: e.target.value})} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" label="Punkt docelowy (np. Kraków)" value={routeForm.endAddress} onChange={(e) => setRouteForm({...routeForm, endAddress: e.target.value})} />
                    </Grid>
                    <Grid item xs={12}>
                        <Button variant="contained" color="primary" startIcon={<RouteIcon />} onClick={handleCalculateRoute} disabled={loading}>
                            {loading ? 'Przetwarzanie...' : 'Oblicz Trasę i Narysuj na Mapie'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* WIDOK WYNIKU TRASY Z MAPĄ */}
            {routeResult && (
                <Paper sx={{ p: 3, backgroundColor: '#fdfdfd', border: '1px solid #bbf7d0', mt: 1 }}>
                    <Typography variant="h6" gutterBottom color="success.main">Szczegóły wyznaczonej trasy</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography><strong>Całkowity dystans:</strong> {routeResult.totalDistanceKm ? routeResult.totalDistanceKm.toFixed(2) : (routeResult.distanceKm || 'Brak')} km</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography><strong>Szacowany czas podróży:</strong> {routeResult.totalTimeMinutes ? routeResult.totalTimeMinutes.toFixed(0) : (routeResult.estimatedTimeMinutes || 'Brak')} min</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography><strong>Wymagane ładowania na trasie:</strong> {routeResult.chargingStops && routeResult.chargingStops.length > 0 ? routeResult.chargingStops.length : '0 (dojedziesz na obecnej baterii!)'}</Typography>
                        </Grid>

                        {routeResult.chargingStops && routeResult.chargingStops.length > 0 && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Stacje ładowania po drodze:</Typography>
                                <List dense>
                                    {routeResult.chargingStops.map((stop, index) => (
                                        <ListItem key={index} sx={{ backgroundColor: '#fff', mb: 1, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                            <ListItemText
                                                primary={`Postój ${index + 1}: ${stop.stationName || 'Stacja EV'}`}
                                                secondary={`Czas ładowania: ${stop.chargingTimeMinutes ? stop.chargingTimeMinutes.toFixed(0) : '?'} min | Cel naładowania: ${stop.targetSoc || '?'}%`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>
                        )}
                    </Grid>

                    {/* NOWA MAPA TYLKO DLA TRASY */}
                    {routeWaypoints.start && routeWaypoints.end && (
                        <Box sx={{ height: 450, width: '100%', mt: 3, borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc' }}>
                            <MapContainer
                                center={[routeWaypoints.start.lat, routeWaypoints.start.lng]}
                                zoom={10}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <RouteBoundsController waypoints={routeWaypoints} />

                                {/* Znacznik Start */}
                                <Marker position={[routeWaypoints.start.lat, routeWaypoints.start.lng]}>
                                    <Popup><strong>Start:</strong> {routeWaypoints.start.name}</Popup>
                                </Marker>

                                {/* Znaczniki postojów na ładowanie */}
                                {routeWaypoints.stops.map((stop, i) => (
                                    <Marker key={`stop-${i}`} position={[stop.lat, stop.lng]}>
                                        <Popup><strong>Postój {i + 1} (Ładowanie):</strong> {stop.name}</Popup>
                                    </Marker>
                                ))}

                                {/* Znacznik Koniec */}
                                <Marker position={[routeWaypoints.end.lat, routeWaypoints.end.lng]}>
                                    <Popup><strong>Cel:</strong> {routeWaypoints.end.name}</Popup>
                                </Marker>

                                {/* Rysowanie samej drogi */}
                                {routePath.length > 0 && (
                                    <Polyline positions={routePath} color="#1e3a8a" weight={5} opacity={0.7} />
                                )}
                            </MapContainer>
                        </Box>
                    )}
                </Paper>
            )}

            {message.text && <Alert severity={message.type} onClose={() => setMessage({text: ''})} sx={{ mt: 2 }}>{message.text}</Alert>}
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f4f6f9' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1e293b' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        System Zarządzania Flotą EV
                    </Typography>
                    <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
                        Wyloguj się
                    </Button>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                {/* === DODANY PANEL Z INFORMACJAMI O UŻYTKOWNIKU === */}
                <Box sx={{ p: 2, backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" color="textSecondary">
                        Zalogowany użytkownik:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                        ID Pracownika: {employeeId || 'Nieznane'}
                    </Typography>
                </Box>
                {/* ================================================= */}
                <Box sx={{ overflow: 'auto' }}>
                    <List>
                        <ListItem button selected={activeTab === 'mapa'} onClick={() => setActiveTab('mapa')}>
                            <ListItemIcon><MapIcon color={activeTab === 'mapa' ? 'primary' : 'inherit'} /></ListItemIcon>
                            <ListItemText primary="Mapa i Stacje" />
                        </ListItem>
                        <ListItem button selected={activeTab === 'pojazdy'} onClick={() => setActiveTab('pojazdy')}>
                            <ListItemIcon><DirectionsCarIcon color={activeTab === 'pojazdy' ? 'primary' : 'inherit'} /></ListItemIcon>
                            <ListItemText primary="Flota Pojazdów" />
                        </ListItem>
                        <ListItem button selected={activeTab === 'trasy'} onClick={() => setActiveTab('trasy')}>
                            <ListItemIcon><RouteIcon color={activeTab === 'trasy' ? 'primary' : 'inherit'} /></ListItemIcon>
                            <ListItemText primary="Trasy i Planowanie" />
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                <Toolbar />
                {activeTab === 'mapa' && renderMapTab()}
                {activeTab === 'pojazdy' && renderVehiclesTab()}
                {activeTab === 'trasy' && renderRoutesTab()}
            </Box>
        </Box>
    );
}