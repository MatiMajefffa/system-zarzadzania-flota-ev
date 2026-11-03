import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Domyślne ikony Leafleta
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [radiusKm, setRadiusKm] = useState(15);
    const [centerCoords, setCenterCoords] = useState({ lat: 50.2649, lng: 19.0238 }); // Katowice
    const [searchAddress, setSearchAddress] = useState('Katowice');

    const token = localStorage.getItem('token');

    // Obsługa wylogowania
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login'; // Lub useNavigate() z react-router-dom
    };

    // Pobranie wszystkich stacji z bazy danych
    const fetchStations = async () => {
        try {
            const response = await fetch('/api/charging-stations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStations(data);
            } else if (response.status === 401 || response.status === 403) {
                setMessage('Sesja wygasła. Zaloguj się ponownie.');
            }
        } catch (err) {
            console.error('Błąd pobierania stacji:', err);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    // Synchronizacja z OpenChargeMap
    const handleSync = async () => {
        setLoading(true);
        setMessage('Pobieranie stacji z OpenChargeMap...');
        try {
            const response = await fetch('/api/charging-stations/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const count = await response.json();
                setMessage(`Pomyślnie pobrano i zapisano w PostGIS stacji: ${count}`);
                fetchStations();
            } else {
                setMessage('Błąd autoryzacji lub synchronizacji stacji.');
            }
        } catch (err) {
            setMessage('Wystąpił błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    // Geokodowanie i wyszukiwanie przestrzenne
    const handleSearchByAddress = async () => {
        if (!searchAddress.trim()) return;

        setLoading(true);
        setMessage(`Szukanie lokalizacji "${searchAddress}"...`);

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
                    setMessage(`Znaleziono ${data.length} stacji w promieniu ${radiusKm} km od: ${searchAddress}`);
                } else {
                    setMessage(`Błąd serwera (Status ${response.status}). Zaloguj się ponownie.`);
                }
            } else {
                setMessage('Nie znaleziono podanego miasta.');
            }
        } catch (err) {
            console.error('Błąd podczas wyszukiwania:', err);
            setMessage('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
            {/* Górny pasek nawigacyjny (Header) */}
            <header style={{
                backgroundColor: '#1e293b',
                color: '#fff',
                padding: '15px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>System Zarządzania Flotą EV</h1>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Wyloguj się
                </button>
            </header>

            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Panel sterowania */}
                <div style={{
                    backgroundColor: '#fff',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        style={{ padding: '10px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {loading ? 'Pobieranie...' : 'Pobierz Stacje (OCM)'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '2px solid #eee', paddingLeft: '15px' }}>
                        <input
                            type="text"
                            placeholder="Wpisz miasto/adres (np. Gliwice)"
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchByAddress()}
                            style={{ padding: '8px', width: '220px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <label style={{ marginLeft: '5px' }}>Promień:</label>
                        <input
                            type="number"
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(e.target.value)}
                            style={{ width: '55px', padding: '7px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <span>km</span>
                        <button
                            onClick={handleSearchByAddress}
                            disabled={loading}
                            style={{ padding: '8px 14px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Szukaj stacji
                        </button>
                    </div>
                </div>

                {message && (
                    <div style={{
                        padding: '12px 15px',
                        backgroundColor: message.includes('Błąd') || message.includes('wybrać') ? '#f8d7da' : '#e2e3e5',
                        color: message.includes('Błąd') ? '#721c24' : '#383d41',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        fontWeight: '500'
                    }}>
                        {message}
                    </div>
                )}

                {/* Mapa Leaflet */}
                <div style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
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
                                        Współrzędne: {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                                    </Popup>
                                </Marker>
                            )
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}