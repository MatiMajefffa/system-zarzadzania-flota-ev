import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Button, List,
    ListItem, ListItemIcon, ListItemText, Badge, IconButton
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningIcon from '@mui/icons-material/Warning';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
// Import podkomponentów
import DriverView from '../components/dashboard/DriverView';
import MapView from '../components/dashboard/MapView';
import VehiclesView from '../components/dashboard/VehiclesView';
import RoutesView from '../components/dashboard/RoutesView';
import DriversView from '../components/dashboard/DriversView';
import NotificationsView from '../components/dashboard/NotificationsView';
import DriverReportsView from '../components/dashboard/DriverReportsView';

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
            if (waypoints.origin) bounds.extend([waypoints.origin.lat, waypoints.origin.lng]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [waypoints, map]);
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

const buildGoogleMapsUrl = (origin, destination, stops = []) => {
    const toParam = (point) => `${point.lat},${point.lng}`;
    const params = new URLSearchParams({
        api: '1',
        destination: toParam(destination),
        travelmode: 'driving',
        dir_action: 'navigate'
    });
    // Bez punktu startowego Google Maps prowadzi z aktualnej lokalizacji urządzenia
    if (origin) params.set('origin', toParam(origin));
    if (stops.length > 0) params.set('waypoints', stops.map(toParam).join('|'));
    return `https://www.google.com/maps/dir/?${params}`;
};

const requestLocation = (enableHighAccuracy) => new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
        resolve(null);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy, timeout: 5000, maximumAge: 30000 }
    );
});

// Komputery bez GPS często nie odpowiadają na tryb wysokiej dokładności, więc jest druga próba
const getDriverLocation = async () => (await requestLocation(true)) ?? requestLocation(false);

const getRouteStops = ({ chargingStops }) =>
    chargingStops.map(stop => ({ lat: stop.latitude, lng: stop.longitude, name: stop.name }));

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
    const [routeHistory, setRouteHistory] = useState([]);
    const [tripStage, setTripStage] = useState('IDLE');
    const [photos, setPhotos] = useState({ pickup: null, dropoff: null });

    const [currentLocation, setCurrentLocation] = useState(null);

    const [drivers, setDrivers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [driverNotifications, setDriverNotifications] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);
    const [deleteCode, setDeleteCode] = useState('');
    const [activeRoutes, setActiveRoutes] = useState([]);

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
                fetchActiveRoutes();
            } else {
                fetchLastRoute();
                fetchRouteHistory();
                fetchDriverNotifications();
            }
        }
    }, [token, userRole]);

    // Kierowca widzi tę samą trasę i symulowaną pozycję co menedżer
    useEffect(() => {
        const routeId = routeResult?.assignedRouteId;
        const isTracked = tripStage === 'EN_ROUTE' || tripStage === 'RETURNING_TO_BASE';
        if (userRole !== 'DRIVER' || !routeId || !isTracked) return undefined;

        const refreshTracking = async () => {
            try {
                const response = await fetch(`/api/routes/${routeId}/tracking`, { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) return;
                const { position, path } = await response.json();
                setCurrentLocation({ lat: position.latitude, lng: position.longitude });
                setRoutePath(previous => (previous.length === path.length ? previous : path));
            } catch (err) { console.error(err); }
        };
        refreshTracking();
        const intervalId = setInterval(refreshTracking, 5000);
        return () => clearInterval(intervalId);
    }, [routeResult?.assignedRouteId, tripStage, userRole, token]);

    // Menedżer widzi postępy kierowców, a kierowca nowe zlecenia i wiadomości bez odświeżania strony
    useEffect(() => {
        if (!token || token === 'undefined' || token === 'null') return undefined;
        const refresh = () => {
            if (userRole === 'MANAGER') {
                fetchNotifications();
                fetchActiveRoutes();
                fetchVehicles();
            } else {
                fetchDriverNotifications();
                // W trakcie podróży etap jest prowadzony lokalnie i nie może zostać nadpisany
                if (tripStage === 'IDLE') fetchLastRoute();
            }
        };
        const intervalId = setInterval(refresh, 15000);
        return () => clearInterval(intervalId);
    }, [token, userRole, tripStage]);

    const unreadDriverNotifications = driverNotifications.filter(n => n.status === 'NIEODCZYTANY');
    const unreadCount = userRole === 'MANAGER'
        ? notifications.filter(n => !n.status || ['NIEODCZYTANY', 'NOWY'].includes(n.status.toUpperCase())).length
        : unreadDriverNotifications.length;

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

    const fetchActiveRoutes = async () => {
        try {
            const response = await fetch('/api/routes/active', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setActiveRoutes(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchDriverNotifications = async () => {
        try {
            const response = await fetch('/api/driver-notifications', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setDriverNotifications(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchLastRoute = async () => {
        try {
            const response = await fetch(`/api/routes/last?employeeId=${employeeId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                const route = await response.json();
                setLastRoute(route);
                // Etap podróży jest tylko w pamięci, więc po odświeżeniu strony odtwarzamy go z bazy
                if (route.status === 'W_TRAKCIE') loadAssignedRoute(route, route.arrivedAt ? 'RETURNING_TO_BASE' : 'EN_ROUTE');
            }
        } catch (err) { console.error(err); }
    };

    const fetchRouteHistory = async () => {
        try {
            const response = await fetch('/api/routes/history', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) setRouteHistory(await response.json());
        } catch (err) { console.error(err); }
    };

    const loadAssignedRoute = (route, stage) => {
        const hasCoordinates = route.startLat != null && route.endLat != null;
        const start = { lat: route.startLat, lng: route.startLng, name: route.startAddress };
        const end = { lat: route.endLat, lng: route.endLng, name: route.endAddress };
        const stops = route.chargingStops.map(stop => ({ lat: stop.latitude, lng: stop.longitude, name: stop.name }));

        setRouteResult({
            assignedRouteId: route.id,
            assignedVehicleId: route.vehicleId,
            vehicleRegistrationNumber: route.vehicleRegistrationNumber,
            distanceKm: route.distanceKm,
            energyRequiredKWh: route.energyRequiredKWh,
            vehicleRangeKm: route.vehicleRangeKm,
            returnBaseName: route.returnBaseName
        });
        setRoutePath([]);
        setRouteWaypoints(hasCoordinates ? { start, end, stops } : { start: null, end: null, stops: [] });
        setTripStage(stage);
    };

    const handleStartAssignedRoute = (route) => {
        loadAssignedRoute(route, 'PICKUP');
        showMessage('Odbierz pojazd z bazy i dodaj zdjęcie, aby rozpocząć trasę.', 'info');
    };

    const handleOpenNavigation = async () => {
        const { start, end, stops } = routeWaypoints;
        if (!start || !end) return;

        const origin = await getDriverLocation();
        const url = tripStage === 'RETURNING_TO_BASE' ? buildGoogleMapsUrl(origin, start) : buildGoogleMapsUrl(origin, end, stops);
        // Przeglądarka może zablokować nową kartę; stan trasy jest w bazie, więc po powrocie etap się odtworzy
        const navigationTab = window.open(url, '_blank');
        if (!navigationTab) window.location.href = url;
    };

    const handlePhotoUpload = async (e, type) => {
        const file = e.target.files[0];
        let startLocation = null;

        // Zdjęcie przy odbiorze rozpoczyna zleconą trasę z miejsca, w którym jest kierowca
        if (type === 'pickup') {
            try {
                startLocation = await getDriverLocation();
                const response = await fetch(`/api/routes/${routeResult.assignedRouteId}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ latitude: startLocation?.lat, longitude: startLocation?.lng })
                });
                if (!response.ok) {
                    showMessage(await response.text(), 'error');
                    setTripStage('IDLE');
                    setRouteResult(null);
                    setRoutePath([]);
                    setRouteWaypoints({ start: null, end: null, stops: [] });
                    fetchLastRoute();
                    return;
                }
                setLastRoute(await response.json());
            } catch (err) {
                console.error(err);
                e.target.value = '';
                showMessage('Błąd połączenia. Spróbuj ponownie.', 'error');
                return;
            }
        }

        setPhotos({ ...photos, [type]: file });
        if (type === 'pickup' && !startLocation) {
            showMessage('Nie udało się pobrać Twojej lokalizacji, więc trasa startuje z bazy. Sprawdź zgodę na lokalizację w przeglądarce.', 'warning', 10000);
        } else {
            showMessage(`Zdjęcie (${type === 'pickup' ? 'Odbiór' : 'Zwrot'}) zapisane lokalnie.`, 'success');
        }
        if (type === 'pickup') {
            if (startLocation) setRouteWaypoints(previous => ({ ...previous, origin: startLocation }));
            setTripStage('EN_ROUTE');
            handleOpenNavigation();
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
                    type: 'SOS'
                })
            });
            if (response.ok) showMessage('Wezwano pomoc drogową!', 'error', 8000);
        } catch (err) { showMessage('Błąd wysyłania alarmu SOS.', 'error'); } finally { setLoading(false); }
    };

    const handleFinishRoute = async () => {
        try {
            const response = await fetch(`/api/routes/${routeResult.assignedRouteId}/arrive`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return showMessage(await response.text(), 'error');

            setRoutePath([]);
            setTripStage('RETURNING_TO_BASE');
            showMessage(`Osiągnięto cel! Udaj się do bazy: ${routeResult?.returnBaseName || 'Katowice'}`, 'info');
        } catch (err) {
            console.error(err);
            showMessage('Błąd połączenia. Spróbuj ponownie.', 'error');
        }
    };

    const handleReturnVehicle = async () => {
        if (!photos.dropoff) return showMessage('Musisz załączyć zdjęcie po zwrocie pojazdu!', 'warning');
        setLoading(true);
        try {
            const response = await fetch(`/api/routes/${routeResult.assignedRouteId}/finish`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                showMessage('Pojazd zwrócony!', 'success');
                setTripStage('IDLE');
                setRouteResult(null);
                setCurrentLocation(null);
                setPhotos({ pickup: null, dropoff: null });
                fetchLastRoute();
                fetchRouteHistory();
            } else {
                showMessage(await response.text() || 'Nie udało się zwrócić pojazdu.', 'error');
            }
        } catch (err) { showMessage('Błąd zwrotu pojazdu.', 'error'); } finally { setLoading(false); }
    };

    const handleStartCharging = async (vehicleId) => {
        try {
            const response = await fetch(`/api/vehicles/${vehicleId}/charge`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            showMessage(response.ok ? 'Rozpoczęto ładowanie pojazdu.' : 'Tego pojazdu nie można teraz ładować.', response.ok ? 'success' : 'error');
            setShowVehicleDetails(false);
            fetchVehicles();
        } catch (e) { showMessage('Błąd łączenia z serwerem.', 'error'); }
    };

    const handleToggleBlockVehicle = async (vehicleId) => {
        try {
            await fetch(`/api/vehicles/${vehicleId}/block`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            showMessage(`Zaktualizowano status blokady pojazdu ID: ${vehicleId}`, 'success');
            setShowVehicleDetails(false);
            fetchVehicles();
        } catch (e) { showMessage('Błąd łączenia z serwerem.', 'error'); }
    };

    // Zleca ostatnio wyznaczoną trasę; zwraca treść błędu albo null
    const handleAssignRouteToDriver = async (driverId) => {
        try {
            const response = await fetch('/api/routes/assign-to-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    employeeId: String(driverId),
                    vehicleId: routeResult.assignedVehicleId,
                    vehicleRegistrationNumber: routeResult.vehicleRegistrationNumber,
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
                    chargingStops: routeResult.chargingStops
                })
            });
            if (!response.ok) return await response.text();

            setRouteResult(prev => ({ ...prev, assigned: true }));
            fetchActiveRoutes();
            return null;
        } catch (err) {
            console.error(err);
            return 'Błąd połączenia z serwerem.';
        }
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
            const url = `/api/routes/plan-auto?startLon=${startLon}&startLat=${startLat}&endLon=${endLon}&endLat=${endLat}&baseName=${encodeURIComponent(formData.startBase)}&vehicleType=${formData.cargoType}`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();

                setRouteResult(data);
                const stops = getRouteStops(data);
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

                showMessage('Trasa wyznaczona pomyślnie!', 'success');
            } else {
                showMessage(response.status === 400 ? await response.text() : 'Nie udało się wyznaczyć trasy.', 'error');
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
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1e293b' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>System Zarządzania Flotą EV</Typography>
                    <IconButton color="inherit" aria-label="Powiadomienia" title="Powiadomienia" onClick={() => setActiveTab('powiadomienia')} sx={{ mr: 1 }}>
                        <Badge badgeContent={unreadCount} color="error">
                            <NotificationsIcon sx={unreadCount > 0 ? {
                                color: '#facc15',
                                '@keyframes bell-glow': {
                                    '0%, 100%': { filter: 'drop-shadow(0 0 1px #facc15)' },
                                    '50%': { filter: 'drop-shadow(0 0 8px #facc15)' }
                                },
                                animation: 'bell-glow 1.5s ease-in-out infinite',
                                '@media (prefers-reduced-motion: reduce)': { animation: 'none', filter: 'drop-shadow(0 0 4px #facc15)' }
                            } : undefined} />
                        </Badge>
                    </IconButton>
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
                                <ListItem button selected={activeTab === 'powiadomienia'} onClick={() => setActiveTab('powiadomienia')}>
                                    <ListItemIcon>
                                        <Badge badgeContent={unreadDriverNotifications.length} color="error">
                                            <NotificationsIcon color={activeTab === 'powiadomienia' ? 'primary' : 'inherit'} />
                                        </Badge>
                                    </ListItemIcon>
                                    <ListItemText primary="Powiadomienia" />
                                </ListItem>
                                <ListItem button selected={activeTab === 'mapa'} onClick={() => setActiveTab('mapa')}>
                                    <ListItemIcon><MapIcon color={activeTab === 'mapa' ? 'primary' : 'inherit'} /></ListItemIcon>
                                    <ListItemText primary="Stacje Ładowania" />
                                </ListItem>
                                <ListItem button selected={activeTab === 'zgloszenia'} onClick={() => setActiveTab('zgloszenia')}>
                                    <ListItemIcon><WarningIcon color={activeTab === 'zgloszenia' ? 'primary' : 'inherit'} /></ListItemIcon>
                                    <ListItemText primary="Zgłoszenia" />
                                </ListItem>
                            </>
                        )}

                        {userRole === 'MANAGER' && (
                            <>
                                <ListItem button selected={activeTab === 'powiadomienia'} onClick={() => setActiveTab('powiadomienia')}>
                                    <ListItemIcon>
                                        <Badge badgeContent={unreadCount} color="error">
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

            <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 3, display: 'flex', flexDirection: 'column' }}>
                <Toolbar />

                {userRole === 'DRIVER' && (
                    <>
                        {activeTab === 'panel-kierowcy' && (
                            <DriverView
                                message={message} setMessage={setMessage} tripStage={tripStage} lastRoute={lastRoute}
                                routeHistory={routeHistory}
                                routeResult={routeResult} photos={photos} handlePhotoUpload={handlePhotoUpload}
                                handleFinishRoute={handleFinishRoute}
                                handleReturnVehicle={handleReturnVehicle} currentLocation={currentLocation} routeWaypoints={routeWaypoints}
                                routePath={routePath}
                                handleSOS={handleSOS} carIcon={carIcon} RouteBoundsController={RouteBoundsController}
                                newRouteNotification={unreadDriverNotifications[0]} onOpenNotifications={() => setActiveTab('powiadomienia')}
                                handleStartAssignedRoute={handleStartAssignedRoute}
                                handleOpenNavigation={handleOpenNavigation}
                            />
                        )}
                        {activeTab === 'zgloszenia' && (
                            <DriverReportsView canReport={tripStage === 'EN_ROUTE' || tripStage === 'RETURNING_TO_BASE'} />
                        )}
                        {activeTab === 'powiadomienia' && (
                            <NotificationsView
                                notifications={driverNotifications}
                                apiBasePath="/api/driver-notifications"
                                title="Moje Powiadomienia"
                                onChanged={fetchDriverNotifications}
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
                                showVehicleDetails={showVehicleDetails} selectedVehicle={selectedVehicle} handleToggleBlockVehicle={handleToggleBlockVehicle} handleStartCharging={handleStartCharging}
                                deleteCode={deleteCode} setDeleteCode={setDeleteCode} handleDeleteVehicle={handleDeleteVehicle} baseIcon={baseIcon}
                            />
                        )}
                        {activeTab === 'trasy' && (
                            <RoutesView
                                vehicles={vehicles}
                                bases={bases}
                                drivers={drivers}
                                message={message}
                                setMessage={setMessage}
                                onRoutePlanned={handlePlanRouteFromBaseAndCargo}
                                activeRoutes={activeRoutes}
                                onActiveRoutesChanged={fetchActiveRoutes}
                                onAssignRoute={handleAssignRouteToDriver}
                                routePath={routePath}
                                routeWaypoints={routeWaypoints}
                                routeResult={routeResult}
                            />
                        )}
                        {activeTab === 'kierowcy' && (
                            <DriversView
                                drivers={drivers}
                                bases={bases}
                                activeRoutes={activeRoutes}
                                message={message}
                                loading={loading}
                                routeResult={routeResult}
                                onPlanRoute={handlePlanRouteFromBaseAndCargo}
                                onAssignRoute={handleAssignRouteToDriver}
                                carIcon={carIcon}
                            />
                        )}
                        {activeTab === 'powiadomienia' && (
                            <NotificationsView notifications={notifications} onChanged={fetchNotifications} />
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}