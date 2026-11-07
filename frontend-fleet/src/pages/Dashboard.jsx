import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Button, List,
    ListItem, ListItemIcon, ListItemText, TextField, Paper, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    MenuItem, Select, FormControl, InputLabel, Grid, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions, Badge, IconButton, Divider
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import LogoutIcon from '@mui/icons-material/Logout';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import WarningIcon from '@mui/icons-material/Warning';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NavigationIcon from '@mui/icons-material/Navigation';
import DeleteIcon from '@mui/icons-material/Delete';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// === IKONA DLA SAMOCHODU W NAWIGACJI ===
const carIcon = new L.DivIcon({
    html: '<div style="font-size: 30px; line-height: 30px; text-align: center;">🚘</div>',
    className: 'custom-car-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// === IKONA DLA BAZ FIRMOWYCH (BUDYNEK) ===
const baseIcon = new L.DivIcon({
    html: '<div style="font-size: 24px; line-height: 24px; text-align: center; background: white; border-radius: 50%; border: 2px solid #1976d2; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🏢</div>',
    className: 'custom-base-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const drawerWidth = 240;

function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat && center.lng) {
            map.flyTo([center.lat, center.lng], 12);
        }
    }, [center, map]);
    return null;
}

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

// === KOMPONENT ŚLEDZĄCY NAWIGACJĘ ===
function NavigationController({ position, isNavigating }) {
    const map = useMap();
    useEffect(() => {
        if (isNavigating && position) {
            // Animujemy płynnie do pozycji pojazdu z dużym przybliżeniem (zoom 16)
            map.setView([position.lat, position.lng], 16, { animate: true });
        }
    }, [position, isNavigating, map]);
    return null;
}

const getRoleFromToken = (token) => {
    if (!token) return 'DRIVER';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        let role = payload.role || payload.roles || payload.authorities || 'DRIVER';
        if (Array.isArray(role) && role.length > 0) role = role[0].authority || role[0];
        if (typeof role === 'string') role = role.replace('ROLE_', '').toUpperCase();
        if (role === 'MANAGER' || role === 'ADMIN') return 'MANAGER';
        return 'DRIVER';
    } catch (e) {
        return 'DRIVER';
    }
};

export default function Dashboard() {
    const token = localStorage.getItem('token');
    const employeeId = localStorage.getItem('employeeId');
    const userRole = getRoleFromToken(token);

    const [activeTab, setActiveTab] = useState(userRole === 'MANAGER' ? 'mapa' : 'panel-kierowcy');

    const [stations, setStations] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: 'info' });
    const [radiusKm, setRadiusKm] = useState(15);
    const [centerCoords, setCenterCoords] = useState({ lat: 50.2649, lng: 19.0238 });
    const [searchAddress, setSearchAddress] = useState('Katowice');
    const [isAuthenticated, setIsAuthenticated] = useState(true);

    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
        registrationNumber: '', model: '', batteryCapacityKWh: '', stateOfCharge: '', status: 'DOSTEPNY'
    });

    const [routeForm, setRouteForm] = useState({ vehicleId: '', startAddress: '', endAddress: '' });
    const [routeResult, setRouteResult] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [routeWaypoints, setRouteWaypoints] = useState({ start: null, end: null, stops: [] });

    // === STANY DLA KIEROWCY (CYKL ŻYCIA TRASY + NAWIGACJA) ===
    const [lastRoute, setLastRoute] = useState(null);
    const [driverNavForm, setDriverNavForm] = useState({ startAddress: '', endAddress: '' });
    const [reportForm, setReportForm] = useState({ description: '' });
    const [tripStage, setTripStage] = useState('IDLE'); // IDLE, PICKUP, EN_ROUTE, RETURNING_TO_BASE
    const [photos, setPhotos] = useState({ pickup: null, dropoff: null });

    // Nowe stany dla nawigacji GPS
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // === STANY DLA MENEDŻERA ===
    const [drivers, setDrivers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);
    const [deleteCode, setDeleteCode] = useState('');
    const [assignRouteDialog, setAssignRouteDialog] = useState({ open: false, driverId: null, start: '', end: '' });

    useEffect(() => {
        if (!token || token === 'undefined' || token === 'null') {
            setIsAuthenticated(false);
        } else {
            fetchStations();
            fetchVehicles();
            fetchBases();
            if (userRole === 'MANAGER') {
                fetchDrivers();
                fetchNotifications();
            } else {
                fetchLastRoute();
            }
        }
    }, [token, userRole]);

    // === EFEKT GEOLOKACJI (NAWIGACJA GPS W TLE) ===
    useEffect(() => {
        let watchId;
        if (isNavigating && 'geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    console.error("Błąd lokalizacji GPS:", err);
                    showMessage("Nie udało się pobrać lokalizacji GPS. Sprawdź uprawnienia przeglądarki.", "error");
                    setIsNavigating(false);
                },
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isNavigating]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('employeeId');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
    };

    if (!isAuthenticated) {
        window.location.href = '/login';
        return null;
    }

    const showMessage = (text, type = 'info', timeout = 5000) => {
        setMessage({ text, type });
        if (timeout) setTimeout(() => setMessage({ text: '', type: 'info' }), timeout);
    };

    // ==========================================
    // API CALLS
    // ==========================================
    const fetchStations = async () => {
        try {
            const response = await fetch('/api/charging-stations', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setStations(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchBases = async () => {
        try {
            const response = await fetch('/api/bases', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setBases(await response.json());
        } catch (err) { console.error("Błąd pobierania baz:", err); }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setVehicles(await response.json());
        } catch (err) { console.error(err); }
    };

    // POPRAWIONA WERSJA:
    const fetchDrivers = async () => {
        try {
            const response = await fetch('/api/users/drivers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDrivers(data);
            }
        } catch (err) {
            console.error("Błąd pobierania kierowców:", err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error("Błąd pobierania powiadomień:", err);
        }
    };

    const fetchLastRoute = async () => {
        try {
            const response = await fetch(`/api/routes/last?employeeId=${employeeId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setLastRoute(await response.json());
        } catch (err) { console.error(err); }
    };

    // ==========================================
    // LOGIKA KIEROWCY
    // ==========================================
    const handleAutoAssignRoute = async () => {
        if (!driverNavForm.startAddress || !driverNavForm.endAddress) return showMessage('Wpisz punkt startowy i docelowy.', 'warning');
        setLoading(true);
        setRouteResult(null); setRoutePath([]); setRouteWaypoints({ start: null, end: null, stops: [] });
        setIsNavigating(false);
        setCurrentLocation(null);

        try {
            const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(driverNavForm.startAddress + ', Polska')}&limit=1`);
            const startData = await startRes.json();
            const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(driverNavForm.endAddress + ', Polska')}&limit=1`);
            const endData = await endRes.json();

            if (!startData.length || !endData.length) {
                setLoading(false); return showMessage('Nie znaleziono jednego z adresów.', 'error');
            }

            const startLat = parseFloat(startData[0].lat), startLon = parseFloat(startData[0].lon);
            const endLat = parseFloat(endData[0].lat), endLon = parseFloat(endData[0].lon);

            const url = `/api/routes/plan-auto?startLon=${startLon}&startLat=${startLat}&endLon=${endLon}&endLat=${endLat}&temperature=15.0`;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

            if (response.ok) {
                const data = await response.json();
                if (!data.energyRequiredKWh) data.energyRequiredKWh = (data.distanceKm || 50) * 0.18;
                if (!data.vehicleRangeKm) data.vehicleRangeKm = 300;

                setRouteResult(data);

                const stops = (data.chargingStops || []).map(s => ({ lat: s.latitude, lng: s.longitude, name: s.stationName }));
                setRouteWaypoints({
                    start: { lat: startLat, lng: startLon, name: driverNavForm.startAddress },
                    end: { lat: endLat, lng: endLon, name: driverNavForm.endAddress },
                    stops
                });

                try {
                    const osrmCoords = [`${startLon},${startLat}`, ...stops.map(s => `${s.lng},${s.lat}`), `${endLon},${endLat}`].join(';');
                    const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`);
                    const osrmData = await osrmRes.json();
                    if (osrmData.routes?.length > 0) {
                        setRoutePath(osrmData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
                    }
                } catch (e) { console.error(e); }

                showMessage('Przydzielono pojazd! Rozpocznij procedurę odbioru.', 'success');
                setTripStage('PICKUP');
            } else {
                showMessage(`Brak dostępnych pojazdów w bazach.`, 'error');
            }
        } catch (err) { showMessage('Błąd serwera.', 'error'); } finally { setLoading(false); }
    };

    const handlePhotoUpload = (e, type) => {
        setPhotos({ ...photos, [type]: e.target.files[0] });
        showMessage(`Zdjęcie (${type === 'pickup' ? 'Odbiór' : 'Zwrot'}) zapisane lokalnie.`, 'success');
        if (type === 'pickup') {
            setTripStage('EN_ROUTE');
        }
    };

    const handleSOS = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    description: '🚨 ALARM SOS: Kierowca wezwał pomoc drogową na trasie!',
                    employeeId: employeeId || 'Nieznany'
                })
            });
            if (response.ok) {
                showMessage('Wezwano pomoc drogową! Wysłano alarm SOS do Menedżera.', 'error', 8000);
            }
        } catch (err) {
            showMessage('Błąd wysyłania alarmu SOS.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFinishRoute = () => {
        setIsNavigating(false); // Automatycznie wyłącza GPS po dotarciu do celu
        setTripStage('RETURNING_TO_BASE');
        showMessage(`Osiągnięto cel! Udaj się do najbliższej bazy: ${routeResult?.returnBaseName || 'Katowice'}`, 'info');
    };

    const handleReturnVehicle = async () => {
        if (!photos.dropoff) return showMessage('Musisz załączyć zdjęcie po zwrocie pojazdu w bazie!', 'warning');
        setLoading(true);
        try {
            const baseName = routeResult?.returnBaseName || 'Katowice';
            const response = await fetch(`/api/vehicles/${routeResult.assignedVehicleId}/return?baseName=${encodeURIComponent(baseName)}`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                showMessage('Pojazd zwrócony! Dziękujemy za trasę.', 'success');
                setTripStage('IDLE');
                setRouteResult(null);
                setPhotos({ pickup: null, dropoff: null });
                setDriverNavForm({ startAddress: '', endAddress: '' });
                fetchLastRoute();
            }
        } catch (err) { showMessage('Błąd zwrotu pojazdu.', 'error'); } finally { setLoading(false); }
    };

    const handleReportDamage = async () => {
        if (!reportForm.description) return;
        setLoading(true);
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ description: reportForm.description, employeeId })
            });
            if (response.ok) {
                showMessage('Zgłoszenie wysłane do menedżera.', 'success');
                setReportForm({ description: '' });
            }
        } catch (err) { showMessage('Błąd serwera.', 'error'); } finally { setLoading(false); }
    };

    // ==========================================
    // LOGIKA MENEDŻERA
    // ==========================================
    const handleToggleBlockVehicle = async (vehicleId) => {
        try {
            await fetch(`/api/vehicles/${vehicleId}/block`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            showMessage(`Zaktualizowano status zablokowania dla pojazdu ID: ${vehicleId}`, 'success');
            setShowVehicleDetails(false);
            fetchVehicles();
        } catch (e) { showMessage('Błąd łączenia z serwerem.', 'error'); }
    };

    const handleAssignRouteToDriver = async () => {
        showMessage(`Trasa zlecona kierowcy ID: ${assignRouteDialog.driverId}`, 'success');
        setAssignRouteDialog({ open: false, driverId: null, start: '', end: '' });
    };

    const handleSync = async () => {
        setLoading(true); showMessage('Pobieranie stacji z OCM...', 'info');
        try {
            const res = await fetch('/api/charging-stations/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { showMessage('Synchronizacja zakończona', 'success'); fetchStations(); }
        } catch (e) { showMessage('Błąd synchronizacji', 'error'); } finally { setLoading(false); }
    };

    const handleSearchByAddress = async () => {
        if (!searchAddress.trim()) return;
        setLoading(true);
        try {
            const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress + ', Polska')}&limit=1`);
            const geocodeData = await geocodeRes.json();
            if (geocodeData.length > 0) {
                const lat = parseFloat(geocodeData[0].lat), lng = parseFloat(geocodeData[0].lon);
                setCenterCoords({ lat, lng });
                const res = await fetch(`/api/charging-stations/nearby?latitude=${lat}&longitude=${lng}&radiusKm=${radiusKm}`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setStations(await res.json());
            }
        } catch (e) { showMessage('Błąd', 'error'); } finally { setLoading(false); }
    };

    const handleAddVehicle = async (e) => {
        e.preventDefault(); setLoading(true);
        const payload = {
            registrationNumber: newVehicle.registrationNumber,
            model: newVehicle.model,
            batteryCapacityKWh: parseFloat(newVehicle.batteryCapacityKWh),
            stateOfCharge: parseInt(newVehicle.stateOfCharge, 10),
            status: newVehicle.status,
            currentBase: newVehicle.currentBase
        };
        try {
            const res = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showMessage('Dodano pojazd!', 'success');
                setShowVehicleForm(false);
                setNewVehicle({ registrationNumber: '', model: '', batteryCapacityKWh: '', stateOfCharge: '', status: 'DOSTEPNY', currentBase: '' });
                fetchVehicles();
            } else {
                showMessage('Błąd podczas dodawania pojazdu.', 'error');
            }
        } catch (e) { showMessage('Błąd połączenia z serwerem.', 'error'); } finally { setLoading(false); }
    };

    const handleDeleteVehicle = async (id) => {
        if (deleteCode !== '6969') {
            showMessage('Nieprawidłowy kod usuwania pojazdu!', 'error');
            return;
        }

        if (!window.confirm("Czy na pewno chcesz trwale usunąć ten zablokowany pojazd z bazy?")) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/vehicles/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok || response.status === 204) {
                showMessage(`Pojazd ID: ${id} został usunięty.`, 'success');
                setShowVehicleDetails(false);
                setDeleteCode('');
                fetchVehicles();
            } else {
                showMessage('Błąd usuwania pojazdu.', 'error');
            }
        } catch (err) {
            showMessage('Błąd połączenia z serwerem.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateRoute = async () => {
        if (!routeForm.vehicleId || !routeForm.startAddress || !routeForm.endAddress) return showMessage('Wypełnij pola', 'warning');
        setLoading(true);
        try {
            const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(routeForm.startAddress)}&limit=1`);
            const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(routeForm.endAddress)}&limit=1`);
            const startData = await startRes.json(); const endData = await endRes.json();

            const startLat = parseFloat(startData[0].lat), startLon = parseFloat(startData[0].lon);
            const endLat = parseFloat(endData[0].lat), endLon = parseFloat(endData[0].lon);

            const res = await fetch(`/api/routes/plan?vehicleId=${routeForm.vehicleId}&startLon=${startLon}&startLat=${startLat}&endLon=${endLon}&endLat=${endLat}&temperature=15.0`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setRouteResult(data);
                const stops = (data.chargingStops || []).map(s => ({ lat: s.latitude, lng: s.longitude, name: s.stationName }));
                setRouteWaypoints({ start: { lat: startLat, lng: startLon, name: routeForm.startAddress }, end: { lat: endLat, lng: endLon, name: routeForm.endAddress }, stops });
            }
        } catch (e) { showMessage('Błąd', 'error'); } finally { setLoading(false); }
    };

    // ==========================================
    // WIDOKI KOMPONENTÓW
    // ==========================================
    const renderDriverTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {message.text && <Alert severity={message.type} onClose={() => setMessage({text: ''})}>{message.text}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">Panel Kierowcy</Typography>
                {tripStage === 'EN_ROUTE' && (
                    <Button variant="contained" color="error" size="large" startIcon={<LocalHospitalIcon />} onClick={handleSOS} sx={{ animation: 'pulse 2s infinite' }}>
                        SOS - WEZWIJ POMOC
                    </Button>
                )}
            </Box>

            {tripStage === 'IDLE' && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, height: '100%', borderTop: '4px solid #1976d2' }}>
                            <Typography variant="h6" gutterBottom color="primary">Ostatnio odbyta trasa</Typography>
                            {lastRoute ? (
                                <Box sx={{ mt: 2 }}>
                                    <Typography><strong>Skąd:</strong> {lastRoute.startAddress || 'Nieznane'}</Typography>
                                    <Typography><strong>Dokąd:</strong> {lastRoute.endAddress || 'Nieznane'}</Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Dystans: {lastRoute.distanceKm ? lastRoute.distanceKm.toFixed(2) : '?'} km</Typography>
                                </Box>
                            ) : <Typography color="textSecondary" sx={{ mt: 2 }}>Brak tras w historii.</Typography>}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, height: '100%', borderTop: '4px solid #2e7d32' }}>
                            <Typography variant="h6" gutterBottom color="success.main">Rozpocznij nową trasę</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Skąd" value={driverNavForm.startAddress} onChange={(e) => setDriverNavForm({...driverNavForm, startAddress: e.target.value})} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Dokąd" value={driverNavForm.endAddress} onChange={(e) => setDriverNavForm({...driverNavForm, endAddress: e.target.value})} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button variant="contained" color="success" startIcon={<RouteIcon />} onClick={handleAutoAssignRoute} disabled={loading} fullWidth>
                                        Przydziel Pojazd i Oblicz Trasę
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {routeResult && tripStage !== 'IDLE' && (
                <Paper sx={{ p: 3, border: '2px solid #1976d2' }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                        {tripStage === 'PICKUP' && "KROK 1: Odbierz pojazd z bazy"}
                        {tripStage === 'EN_ROUTE' && "KROK 2: Jesteś w trasie"}
                        {tripStage === 'RETURNING_TO_BASE' && "KROK 3: Dojedź do bazy i zwróć pojazd"}
                    </Typography>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6}>
                            <Alert severity="info">
                                <strong>Przypisany Pojazd:</strong> {routeResult.vehicleRegistrationNumber || 'Auto Systemowe'}<br/>
                                <strong>Zasięg pojazdu:</strong> ~{routeResult.vehicleRangeKm?.toFixed(0) || '?'} km<br/>
                                <strong>Wymagana energia:</strong> {routeResult.energyRequiredKWh?.toFixed(1)} kWh
                            </Alert>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Alert severity="success">
                                <strong>Dystans całkowity:</strong> {routeResult.totalDistanceKm ? routeResult.totalDistanceKm.toFixed(2) : routeResult.distanceKm?.toFixed(2)} km<br/>
                                <strong>Czas podróży:</strong> {routeResult.totalTimeMinutes ? routeResult.totalTimeMinutes.toFixed(0) : routeResult.estimatedTimeMinutes?.toFixed(0)} min<br/>
                                <strong>Baza docelowa na koniec:</strong> {routeResult.returnBaseName || 'Katowice'}
                            </Alert>
                        </Grid>
                    </Grid>

                    {/* PRZYCISKI ZDJĘĆ I NAWIGACJI */}
                    <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                        {tripStage === 'PICKUP' && (
                            <>
                                <Button component="label" variant="contained" startIcon={<PhotoCameraIcon />}>
                                    Zdjęcie przed odbiorem
                                    <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'pickup')} />
                                </Button>
                                {photos.pickup && <Typography color="success.main"><b>Zapisano. Trasa rozpoczęta!</b></Typography>}
                            </>
                        )}
                        {tripStage === 'EN_ROUTE' && (
                            <>
                                <Button
                                    variant="contained"
                                    color={isNavigating ? "secondary" : "info"}
                                    size="large"
                                    startIcon={<NavigationIcon />}
                                    onClick={() => setIsNavigating(!isNavigating)}
                                    sx={{ minWidth: 250 }}
                                >
                                    {isNavigating ? "Zatrzymaj Nawigację" : "Uruchom Nawigację (GPS)"}
                                </Button>
                                <Button variant="contained" color="primary" size="large" onClick={handleFinishRoute}>
                                    Zgłoś dojazd do celu
                                </Button>
                            </>
                        )}
                        {tripStage === 'RETURNING_TO_BASE' && (
                            <>
                                <Button component="label" variant="contained" color="warning" startIcon={<PhotoCameraIcon />}>
                                    Zdjęcie po zaparkowaniu (Baza)
                                    <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'dropoff')} />
                                </Button>
                                <Button variant="contained" color="success" size="large" onClick={handleReturnVehicle} disabled={!photos.dropoff}>
                                    Potwierdź zwrot do: {routeResult.returnBaseName || 'Katowice'}
                                </Button>
                            </>
                        )}
                    </Box>

                    {/* MAPA NAWIGACJI */}
                    {routeWaypoints.start && routeWaypoints.end && (
                        <Box sx={{ height: 450, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc', position: 'relative' }}>
                            <MapContainer center={[routeWaypoints.start.lat, routeWaypoints.start.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                {/* Jeśli nawigacja nie jest włączona, pokaż całą trasę */}
                                {!isNavigating && <RouteBoundsController waypoints={routeWaypoints} />}

                                {/* Jeśli nawigacja włączona - centruj na pojeździe */}
                                <NavigationController position={currentLocation} isNavigating={isNavigating} />

                                <Marker position={[routeWaypoints.start.lat, routeWaypoints.start.lng]}><Popup>Start</Popup></Marker>
                                <Marker position={[routeWaypoints.end.lat, routeWaypoints.end.lng]}><Popup>Cel</Popup></Marker>

                                {/* Ikonka jadącego auta w aktualnej pozycji */}
                                {currentLocation && (
                                    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={carIcon}>
                                        <Popup>Twoja aktualna pozycja</Popup>
                                    </Marker>
                                )}

                                {routePath.length > 0 && <Polyline positions={routePath} color="#1e3a8a" weight={5} />}
                            </MapContainer>
                        </Box>
                    )}
                </Paper>
            )}

            <Paper sx={{ p: 3, borderTop: '4px solid #d32f2f', mt: 2 }}>
                <Typography variant="h6" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon /> Formularz Zgłoszeń i Usterek
                </Typography>
                <TextField fullWidth label="Szczegóły problemu na trasie" multiline rows={3} sx={{ mb: 2 }} value={reportForm.description} onChange={(e) => setReportForm({...reportForm, description: e.target.value})} />
                <Button variant="contained" color="error" onClick={handleReportDamage} disabled={loading || !reportForm.description}>Wyślij zgłoszenie</Button>
            </Paper>
        </Box>
    );

    const renderMapTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {userRole === 'MANAGER' && (
                    <Button variant="contained" color="success" startIcon={<SyncIcon />} onClick={handleSync} disabled={loading}>
                        Pobierz Stacje (OCM)
                    </Button>
                )}
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
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={centerCoords} />

                    {/* Renderowanie stacji ładowania */}
                    {stations.map((st) => (
                        st.latitude && st.longitude && (
                            <Marker key={`station-${st.id}`} position={[st.latitude, st.longitude]}>
                                <Popup>
                                    <strong>{st.name}</strong><br />
                                    Moc: {st.powerKW || 22} kW<br />
                                    Dostępność: {st.isAvailable ? 'Dostępna' : 'Zajęta'}
                                </Popup>
                            </Marker>
                        )
                    ))}

                    {/* Renderowanie baz firmowych z bazy danych */}
                    {bases.map((baza) => (
                        <Marker key={`base-${baza.id}`} position={[baza.latitude, baza.longitude]} icon={baseIcon}>
                            <Popup>
                                <strong style={{ color: '#1976d2' }}>{baza.name}</strong><br />
                                Główny parking floty EV
                            </Popup>
                        </Marker>
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
                        <TextField required label="Bateria (kWh)" type="number" size="small" value={newVehicle.batteryCapacityKWh} onChange={(e) => setNewVehicle({...newVehicle, batteryCapacityKWh: e.target.value})} />
                        <TextField required label="Naładowanie (%)" type="number" size="small" value={newVehicle.stateOfCharge} onChange={(e) => setNewVehicle({...newVehicle, stateOfCharge: e.target.value})} />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={newVehicle.status} label="Status" onChange={(e) => setNewVehicle({...newVehicle, status: e.target.value})}>
                                <MenuItem value="DOSTEPNY">Dostępny</MenuItem>
                                <MenuItem value="W_TRASIE">W trasie</MenuItem>
                                <MenuItem value="LADOWANIE">Ładuje się</MenuItem>
                                <MenuItem value="SERWIS">Serwis</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 200 }} required>
                            <InputLabel>Baza / Miejsce postoju</InputLabel>
                            <Select
                                value={newVehicle.currentBase}
                                label="Baza / Miejsce postoju"
                                onChange={(e) => setNewVehicle({...newVehicle, currentBase: e.target.value})}
                            >
                                {bases.map((b) => (
                                    <MenuItem key={b.id} value={b.name}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button type="submit" variant="contained" color="success" startIcon={<SaveIcon />} disabled={loading}>Zapisz Pojazd</Button>
                    </Box>
                </Paper>
            )}

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ backgroundColor: '#f0f2f5' }}>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Rejestracja</strong></TableCell>
                            <TableCell><strong>Model</strong></TableCell>
                            <TableCell><strong>Bateria / SoC</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Szczegóły</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vehicles.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">Brak pojazdów.</TableCell></TableRow>
                        ) : (
                            vehicles.map((v) => (
                                <TableRow key={v.id} sx={{ opacity: v.isBlocked ? 0.5 : 1 }}>
                                    <TableCell>{v.id}</TableCell>
                                    <TableCell>{v.registrationNumber}</TableCell>
                                    <TableCell>{v.model}</TableCell>
                                    <TableCell>{v.batteryCapacityKWh} kWh / {v.stateOfCharge}%</TableCell>
                                    <TableCell>{v.isBlocked ? 'ZABLOKOWANY' : v.status}</TableCell>
                                    <TableCell align="right">
                                        <IconButton color="info" onClick={() => { setSelectedVehicle(v); setShowVehicleDetails(true); }}>
                                            <InfoIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={showVehicleDetails} onClose={() => setShowVehicleDetails(false)} maxWidth="md" fullWidth>
                {selectedVehicle && (
                    <>
                        <DialogTitle>Szczegóły Pojazdu: {selectedVehicle.registrationNumber}</DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1"><strong>Przebieg całkowity:</strong> {selectedVehicle.totalMileage || 12450} km</Typography>
                                    <Typography variant="subtitle1"><strong>Aktualna Baza:</strong> {selectedVehicle.currentBase || 'Katowice'}</Typography>

                                    <FormControlLabel
                                        control={<Switch checked={selectedVehicle.isBlocked || false} onChange={() => handleToggleBlockVehicle(selectedVehicle.id)} color="error" />}
                                        label="Wyklucz z algorytmu (Zablokuj)"
                                        sx={{ mt: 2 }}
                                    />
                                    {/* USUWANIE POJAZDU ZA POMOCĄ KODU (WIDOCZNE PO ZABLOKOWANIU) */}
                                    {selectedVehicle.isBlocked && (
                                        <Box sx={{ mt: 3, p: 2, border: '1px dashed #d32f2f', borderRadius: 2, backgroundColor: '#fff5f5' }}>
                                            <Typography variant="subtitle2" color="error" gutterBottom>
                                                Strefa niebezpieczna (Usuwanie pojazdu)
                                            </Typography>
                                            <TextField
                                                size="small"
                                                type="password"
                                                label="Wpisz kod (np. 1234)"
                                                value={deleteCode}
                                                onChange={(e) => setDeleteCode(e.target.value)}
                                                sx={{ mb: 2, width: '100%', backgroundColor: '#fff' }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="error"
                                                startIcon={<DeleteIcon />}
                                                fullWidth
                                                onClick={() => handleDeleteVehicle(selectedVehicle.id)}
                                            >
                                                Usuń pojazd z bazy
                                            </Button>
                                        </Box>
                                    )}
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" color="error">Notatki i Zgłoszenia:</Typography>
                                    <List dense>
                                        {selectedVehicle.reports && selectedVehicle.reports.length > 0 ? (
                                            selectedVehicle.reports.map((report, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={report.description}
                                                        secondary={`Zgłosił ID pracownika: ${report.employeeId || 'Nieznany'}`}
                                                    />
                                                </ListItem>
                                            ))
                                        ) : (
                                            <ListItem>
                                                <ListItemText primary="Brak zgłoszeń dla tego pojazdu." />
                                            </ListItem>
                                        )}
                                    </List>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>Miejsce postoju (Aktualna baza):</Typography>
                                    {(() => {
                                        const matchedBase = bases.find(b => b.name.includes(selectedVehicle.currentBase)) || bases[0];
                                        const lat = matchedBase ? matchedBase.latitude : 50.2649;
                                        const lng = matchedBase ? matchedBase.longitude : 19.0238;

                                        return (
                                            <Box sx={{ height: 250, width: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid #ccc' }}>
                                                <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                    <Marker position={[lat, lng]} icon={baseIcon}>
                                                        <Popup>{selectedVehicle.currentBase || 'Katowice'}</Popup>
                                                    </Marker>
                                                </MapContainer>
                                            </Box>
                                        );
                                    })()}
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowVehicleDetails(false)}>Zamknij</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );

    const renderRoutesTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5">Ręczne Planowanie Tras</Typography>
            <Paper sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Wybierz pojazd</InputLabel>
                            <Select value={routeForm.vehicleId} label="Wybierz pojazd" onChange={(e) => setRouteForm({...routeForm, vehicleId: e.target.value})}>
                                {vehicles.map(v => <MenuItem key={v.id} value={v.id}>{v.registrationNumber} - {v.model}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Skąd" value={routeForm.startAddress} onChange={(e) => setRouteForm({...routeForm, startAddress: e.target.value})} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Dokąd" value={routeForm.endAddress} onChange={(e) => setRouteForm({...routeForm, endAddress: e.target.value})} /></Grid>
                    <Grid item xs={12}><Button variant="contained" onClick={handleCalculateRoute}>Oblicz Trasę</Button></Grid>
                </Grid>
            </Paper>
        </Box>
    );

    const renderManagerDrivers = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5">Baza Kierowców</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#f0f2f5' }}>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Imię i Nazwisko / Email</strong></TableCell>
                            <TableCell><strong>Ostatnia Trasa</strong></TableCell>
                            <TableCell align="right"><strong>Akcje</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {drivers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">Brak zarejestrowanych kierowców w systemie.</TableCell>
                            </TableRow>
                        ) : (
                            drivers.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.id}</TableCell>
                                    <TableCell>{d.firstName ? `${d.firstName} ${d.lastName}` : d.email}</TableCell>
                                    <TableCell>{d.lastRoute || 'Brak aktywnej trasy'}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={() => setAssignRouteDialog({ open: true, driverId: d.id, start: '', end: '' })}>
                                            Zleć Trasę
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog zlecenia trasy bez zmian */}
            <Dialog open={assignRouteDialog.open} onClose={() => setAssignRouteDialog({...assignRouteDialog, open: false})}>
                <DialogTitle>Zleć trasę kierowcy #{assignRouteDialog.driverId}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth size="small" label="Skąd" sx={{ mt: 2, mb: 2 }} value={assignRouteDialog.start} onChange={e => setAssignRouteDialog({...assignRouteDialog, start: e.target.value})} />
                    <TextField fullWidth size="small" label="Dokąd" value={assignRouteDialog.end} onChange={e => setAssignRouteDialog({...assignRouteDialog, end: e.target.value})} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignRouteDialog({...assignRouteDialog, open: false})}>Anuluj</Button>
                    <Button variant="contained" onClick={handleAssignRouteToDriver}>Wyślij Zlecenie</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

    const renderNotifications = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5">Powiadomienia Systemowe</Typography>
            {notifications.map((n, i) => (
                <Alert key={i} severity={n.type === 'SOS' ? 'error' : 'info'} sx={{ fontSize: '1.1rem' }}>
                    <strong>{n.date}</strong> - {n.message}
                </Alert>
            ))}
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f4f6f9' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1e293b' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>System Zarządzania Flotą EV</Typography>
                    <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>Wyloguj</Button>
                </Toolbar>
            </AppBar>

            <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}>
                <Toolbar />
                <Box sx={{ p: 2, backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" color="textSecondary">Zalogowany:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>ID: {employeeId}</Typography>
                    <Typography variant="caption" sx={{ color: userRole === 'MANAGER' ? 'primary.main' : 'success.main', fontWeight: 'bold' }}>Rola: {userRole}</Typography>
                </Box>
                <Box sx={{ overflow: 'auto' }}>
                    <List>
                        {userRole === 'DRIVER' && (
                            <>
                                <ListItem button selected={activeTab === 'panel-kierowcy'} onClick={() => setActiveTab('panel-kierowcy')}>
                                    <ListItemIcon><PersonIcon color={activeTab === 'panel-kierowcy' ? 'primary' : 'inherit'} /></ListItemIcon>
                                    <ListItemText primary="Moja Trasa" />
                                </ListItem>
                                <ListItem button selected={activeTab === 'mapa'} onClick={() => setActiveTab('mapa')}>
                                    <ListItemIcon><MapIcon color={activeTab === 'mapa' ? 'primary' : 'inherit'} /></ListItemIcon>
                                    <ListItemText primary="Stacje Ładowania" />
                                </ListItem>
                            </>
                        )}

                        {userRole === 'MANAGER' && (
                            <>
                                <ListItem button selected={activeTab === 'powiadomienia'} onClick={() => setActiveTab('powiadomienia')}>
                                    <ListItemIcon>
                                        <Badge badgeContent={notifications.filter(n => n.type === 'SOS').length} color="error">
                                            <NotificationsIcon color={activeTab === 'powiadomienia' ? 'primary' : 'inherit'} />
                                        </Badge>
                                    </ListItemIcon>
                                    <ListItemText primary="Powiadomienia" />
                                </ListItem>
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
                                <ListItem button selected={activeTab === 'kierowcy'} onClick={() => setActiveTab('kierowcy')}>
                                    <ListItemIcon><PersonIcon color={activeTab === 'kierowcy' ? 'primary' : 'inherit'} /></ListItemIcon>
                                    <ListItemText primary="Kierowcy & Zlecenia" />
                                </ListItem>
                            </>
                        )}
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                <Toolbar />

                {/* WIDOKI DOSTĘPNE TYLKO DLA KIEROWCY */}
                {userRole === 'DRIVER' && (
                    <>
                        {activeTab === 'panel-kierowcy' && renderDriverTab()}
                        {activeTab === 'mapa' && renderMapTab()}
                    </>
                )}

                {/* WIDOKI DOSTĘPNE TYLKO DLA MENEDŻERA */}
                {userRole === 'MANAGER' && (
                    <>
                        {activeTab === 'mapa' && renderMapTab()}
                        {activeTab === 'pojazdy' && renderVehiclesTab()}
                        {activeTab === 'trasy' && renderRoutesTab()}
                        {activeTab === 'kierowcy' && renderManagerDrivers()}
                        {activeTab === 'powiadomienia' && renderNotifications()}
                    </>
                )}
            </Box>
        </Box>
    );
}