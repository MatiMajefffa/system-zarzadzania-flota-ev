import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Button, List,
    ListItem, ListItemIcon, ListItemText, TextField, Paper, Alert
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import LogoutIcon from '@mui/icons-material/Logout';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';

// Naprawa domyślnych ikon Leafleta
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const drawerWidth = 240;

// Pomocniczy komponent do płynnego przesuwania mapy
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat && center.lng) {
            map.flyTo([center.lat, center.lng], 12);
        }
    }, [center, map]);
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

    const token = localStorage.getItem('token');

    // Mądre sprawdzanie tokena
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

    const showMessage = (text, type = 'info') => setMessage({ text, type });

    // API: Stacje
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

    // API: Pojazdy
    const fetchVehicles = async () => {
        try {
            const response = await fetch('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                setVehicles(await response.json());
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
                    showMessage(`Znaleziono ${data.length} stacji w promieniu ${radiusKm} km od: ${searchAddress}`, 'success');
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

    // WIDOKI (ZAKŁADKI)
    const renderMapTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<SyncIcon />}
                    onClick={handleSync}
                    disabled={loading}
                >
                    {loading ? 'Pobieranie...' : 'Pobierz Stacje (OCM)'}
                </Button>

                <Box sx={{ flexGrow: 1 }} />

                <TextField
                    size="small"
                    label="Miasto / Adres"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchByAddress()}
                />
                <TextField
                    size="small"
                    label="Promień (km)"
                    type="number"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    sx={{ width: 100 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SearchIcon />}
                    onClick={handleSearchByAddress}
                    disabled={loading}
                >
                    Szukaj
                </Button>
            </Paper>

            {message.text && <Alert severity={message.type}>{message.text}</Alert>}

            <Paper sx={{ flexGrow: 1, minHeight: '500px', borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer center={[centerCoords.lat, centerCoords.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
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
        <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Zarządzanie Pojazdami</Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                Lista pojazdów pobrana z backendu (/api/vehicles).
            </Typography>
            {vehicles.length === 0 ? (
                <Alert severity="info">Brak pojazdów w bazie danych.</Alert>
            ) : (
                <ul>
                    {vehicles.map(v => (
                        <li key={v.id}>
                            <strong>{v.brand} {v.model}</strong> — Zasięg: {v.rangeKm} km, Bateria: {v.batteryCapacityKwh} kWh
                        </li>
                    ))}
                </ul>
            )}
            <Button variant="outlined" sx={{ mt: 2 }}>+ Dodaj nowy pojazd</Button>
        </Paper>
    );

    const renderRoutesTab = () => (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Planowanie Tras</Typography>
            <Typography variant="body1" color="textSecondary">
                Tutaj znajdzie się moduł do przypisywania pojazdów do punktów docelowych (korzystający z RouteController).
            </Typography>
        </Paper>
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