import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Button, List,
    ListItem, ListItemIcon, ListItemText, Badge
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
// Import podkomponentów
import DriverView from '../components/dashboard/DriverView';
import MapView from '../components/dashboard/MapView';
import VehiclesView from '../components/dashboard/VehiclesView';
import RoutesView from '../components/dashboard/RoutesView';
import DriversView from '../components/dashboard/DriversView';
import NotificationsView from '../components/dashboard/NotificationsView';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const carIcon = new L.DivIcon({
    html: '<div style="font-size: 30px; line-height: 30px; text-align: center;">🚘</div>',
    className: 'custom-car-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

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

function NavigationController({ position, isNavigating }) {
    const map = useMap();
    useEffect(() => {
        if (isNavigating && position) {
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

    const [lastRoute, setLastRoute] = useState(null);
    const [driverNavForm, setDriverNavForm] = useState({ startAddress: '', endAddress: '' });
    const [reportForm, setReportForm] = useState({ description: '' });
    const [tripStage, setTripStage] = useState('IDLE');
    const [photos, setPhotos] = useState({ pickup: null, dropoff: null });

    const [currentLocation, setCurrentLocation] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);

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

    useEffect(() => {
        let watchId;
        if (isNavigating && 'geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    console.error("Błąd lokalizacji GPS:", err);
                    showMessage("Nie udało się pobrać lokalizacji GPS.", "error");
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
        } catch (err) { console.error(err); }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setVehicles(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchDrivers = async () => {
        try {
            const response = await fetch('/api/users/drivers', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setDrivers(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setNotifications(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchLastRoute = async () => {
        try {
            const response = await fetch(`/api/routes/last?employeeId=${employeeId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setLastRoute(await response.json());
        } catch (err) { console.error(err); }
    };

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
        if (type === 'pickup') setTripStage('EN_ROUTE');
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
            if (response.ok) showMessage('Wezwano pomoc drogową!', 'error', 8000);
        } catch (err) { showMessage('Błąd wysyłania alarmu SOS.', 'error'); } finally { setLoading(false); }
    };

    const handleFinishRoute = () => {
        setIsNavigating(false);
        setTripStage('RETURNING_TO_BASE');
        showMessage(`Osiągnięto cel! Udaj się do bazy: ${routeResult?.returnBaseName || 'Katowice'}`, 'info');
    };

    const handleReturnVehicle = async () => {
        if (!photos.dropoff) return showMessage('Musisz załączyć zdjęcie po zwrocie pojazdu!', 'warning');
        setLoading(true);
        try {
            const baseName = routeResult?.returnBaseName || 'Katowice';
            const response = await fetch(`/api/vehicles/${routeResult.assignedVehicleId}/return?baseName=${encodeURIComponent(baseName)}`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                showMessage('Pojazd zwrócony!', 'success');
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
                showMessage('Zgłoszenie wysłane.', 'success');
                setReportForm({ description: '' });
            }
        } catch (err) { showMessage('Błąd serwera.', 'error'); } finally { setLoading(false); }
    };

    const handleToggleBlockVehicle = async (vehicleId) => {
        try {
            await fetch(`/api/vehicles/${vehicleId}/block`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            showMessage(`Zaktualizowano status blokady pojazdu ID: ${vehicleId}`, 'success');
            setShowVehicleDetails(false);
            fetchVehicles();
        } catch (e) { showMessage('Błąd łączenia z serwerem.', 'error'); }
    };

    const handleAssignRouteToDriver = async () => {
        showMessage(`Trasa zlecona kierowcy ID: ${assignRouteDialog.driverId}`, 'success');
        setAssignRouteDialog({ open: false, driverId: null, start: '', end: '' });
    };

    const handleSync = async () => {
        setLoading(true); showMessage('Pobieranie stacji...', 'info');
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
        } catch (e) { showMessage('Błąd połączenia.', 'error'); } finally { setLoading(false); }
    };

    const handleDeleteVehicle = async (id) => {
        if (deleteCode !== '6969') return showMessage('Nieprawidłowy kod usuwania!', 'error');
        if (!window.confirm("Czy na pewno chcesz usunąć pojazd?")) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/vehicles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (response.ok || response.status === 204) {
                showMessage(`Pojazd ID: ${id} usunięty.`, 'success');
                setShowVehicleDetails(false);
                setDeleteCode('');
                fetchVehicles();
            } else {
                showMessage('Błąd usuwania.', 'error');
            }
        } catch (err) { showMessage('Błąd połączenia.', 'error'); } finally { setLoading(false); }
    };

    const handlePlanRouteFromBaseAndCargo = async (formData) => {
        // formData zawiera: { startBase, cargoType, destination }
        if (!formData.startBase || !formData.cargoType || !formData.destination) {
            return showMessage('Wypełnij wszystkie pola formularza trasy.', 'warning');
        }
        setLoading(true);
        setRouteResult(null);
        setRoutePath([]);
        setRouteWaypoints({ start: null, end: null, stops: [] });

        try {
            // 1. Geokodowanie miejsca docelowego
            const endRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.destination + ', Polska')}&limit=1`);
            const endData = await endRes.json();

            if (!endData.length) {
                setLoading(false);
                return showMessage('Nie znaleziono podanego miejsca docelowego.', 'error');
            }

            const endLat = parseFloat(endData[0].lat);
            const endLon = parseFloat(endData[0].lon);

            // 2. Pobranie współrzędnych wybranej bazy startowej
            const selectedBaseObj = bases.find(b => (b.name || b) === formData.startBase);
            let startLat = 50.2649, startLon = 19.0238; // Domyślnie Katowice

            if (selectedBaseObj && selectedBaseObj.latitude && selectedBaseObj.longitude) {
                startLat = selectedBaseObj.latitude;
                startLon = selectedBaseObj.longitude;
            } else {
                const startRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.startBase + ', Polska')}&limit=1`);
                const startData = await startRes.json();
                if (startData.length) {
                    startLat = parseFloat(startData[0].lat);
                    startLon = parseFloat(startData[0].lon);
                }
            }

            // 3. Wywołanie endpointu backendowego z uwzględnieniem bazy oraz typu pojazdu (cargoType)
            const url = `/api/routes/plan-auto?startLon=${startLon}&startLat=${startLat}&endLon=${endLon}&endLat=${endLat}&baseName=${encodeURIComponent(formData.startBase)}&vehicleType=${formData.cargoType}&temperature=15.0`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.energyRequiredKWh) data.energyRequiredKWh = (data.distanceKm || 50) * 0.18;
                if (!data.vehicleRangeKm) data.vehicleRangeKm = 300;

                setRouteResult(data);
                const stops = (data.chargingStops || []).map(s => ({ lat: s.latitude, lng: s.longitude, name: s.stationName }));
                setRouteWaypoints({
                    start: { lat: startLat, lng: startLon, name: formData.startBase },
                    end: { lat: endLat, lng: endLon, name: formData.destination },
                    stops
                });

                // Pobranie geometrii trasy z OSRM
                try {
                    const osrmCoords = [`${startLon},${startLat}`, ...stops.map(s => `${s.lng},${s.lat}`), `${endLon},${endLat}`].join(';');
                    const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`);
                    const osrmData = await osrmRes.json();
                    if (osrmData.routes?.length > 0) {
                        setRoutePath(osrmData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
                    }
                } catch (e) { console.error(e); }

                showMessage('Trasa wyznaczona pomyślnie! Przełączam na mapę.', 'success');
                setActiveTab('mapa');
                setTripStage('EN_ROUTE');
                setIsNavigating(true);

            } else {
                showMessage('Brak dostępnych pojazdów tego typu w wybranej bazie.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMessage('Błąd podczas wyznaczania trasy.', 'error');
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
            }
        } catch (e) { showMessage('Błąd', 'error'); } finally { setLoading(false); }
    };

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

                {userRole === 'DRIVER' && (
                    <>
                        {activeTab === 'panel-kierowcy' && (
                            <DriverView
                                message={message} setMessage={setMessage} tripStage={tripStage} lastRoute={lastRoute}
                                driverNavForm={driverNavForm} setDriverNavForm={setDriverNavForm} handleAutoAssignRoute={handleAutoAssignRoute}
                                loading={loading} routeResult={routeResult} photos={photos} handlePhotoUpload={handlePhotoUpload}
                                isNavigating={isNavigating} setIsNavigating={setIsNavigating} handleFinishRoute={handleFinishRoute}
                                handleReturnVehicle={handleReturnVehicle} currentLocation={currentLocation} routeWaypoints={routeWaypoints}
                                routePath={routePath} reportForm={reportForm} setReportForm={setReportForm} handleReportDamage={handleReportDamage}
                                handleSOS={handleSOS} carIcon={carIcon} RouteBoundsController={RouteBoundsController} NavigationController={NavigationController}
                            />
                        )}
                        {activeTab === 'mapa' && (
                            <MapView
                                userRole={userRole} handleSync={handleSync} loading={loading} searchAddress={searchAddress}
                                setSearchAddress={setSearchAddress} handleSearchByAddress={handleSearchByAddress} radiusKm={radiusKm}
                                setRadiusKm={setRadiusKm} message={message} centerCoords={centerCoords} stations={stations}
                                bases={bases} baseIcon={baseIcon} MapController={MapController}
                            />
                        )}
                    </>
                )}

                {userRole === 'MANAGER' && (
                    <>
                        {activeTab === 'mapa' && (
                            <MapView
                                userRole={userRole} handleSync={handleSync} loading={loading} searchAddress={searchAddress}
                                setSearchAddress={setSearchAddress} handleSearchByAddress={handleSearchByAddress} radiusKm={radiusKm}
                                setRadiusKm={setRadiusKm} message={message} centerCoords={centerCoords} stations={stations}
                                bases={bases} baseIcon={baseIcon} MapController={MapController}
                            />
                        )}
                        {activeTab === 'pojazdy' && (
                            <VehiclesView
                                message={message} setMessage={setMessage} showVehicleForm={showVehicleForm} setShowVehicleForm={setShowVehicleForm}
                                newVehicle={newVehicle} setNewVehicle={setNewVehicle} bases={bases} handleAddVehicle={handleAddVehicle}
                                loading={loading} vehicles={vehicles} setSelectedVehicle={setSelectedVehicle} setShowVehicleDetails={setShowVehicleDetails}
                                showVehicleDetails={showVehicleDetails} selectedVehicle={selectedVehicle} handleToggleBlockVehicle={handleToggleBlockVehicle}
                                deleteCode={deleteCode} setDeleteCode={setDeleteCode} handleDeleteVehicle={handleDeleteVehicle} baseIcon={baseIcon}
                            />
                        )}
                        {activeTab === 'trasy' && (
                            <RoutesView
                                vehicles={vehicles}
                                bases={bases} // <--- Przekazujemy listę baz z bazy danych
                                onRoutePlanned={handlePlanRouteFromBaseAndCargo} // <--- Nowa funkcja obsługująca formularz
                            />
                        )}
                        {activeTab === 'kierowcy' && (
                            <DriversView drivers={drivers} assignRouteDialog={assignRouteDialog} setAssignRouteDialog={setAssignRouteDialog} handleAssignRouteToDriver={handleAssignRouteToDriver} />
                        )}
                        {activeTab === 'powiadomienia' && (
                            <NotificationsView notifications={notifications} />
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}