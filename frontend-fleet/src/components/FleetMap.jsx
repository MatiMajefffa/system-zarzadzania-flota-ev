import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Paper, Typography, Box, Chip } from '@mui/material';

// Standardowe ikony Leafleta dla pojazdów
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Własna ikona dla Stacji Ładowania (Zielony znacznik)
const stationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const SILESIA_CENTER = [50.2649, 19.0238];

export default function FleetMap({ vehicles = [], stations = [], routeGeometry = null }) {
    return (
        <Paper elevation={3} sx={{ p: 2, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Mapa Floty i Stacji Ładowania (Śląsk)
            </Typography>
            <Box sx={{ height: '450px', width: '100%', borderRadius: 1, overflow: 'hidden' }}>
                <MapContainer
                    center={SILESIA_CENTER}
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Markery Pojazdów */}
                    {vehicles.map((v) => {
                        const lat = v.latitude || 50.2649 + (v.id * 0.02);
                        const lng = v.longitude || 19.0238 + (v.id * 0.03);

                        return (
                            <Marker key={`vehicle-${v.id}`} position={[lat, lng]}>
                                <Popup>
                                    <Typography variant="subtitle2" fontWeight="bold">{v.model}</Typography>
                                    <Typography variant="body2">Rejestracja: <strong>{v.registrationNumber}</strong></Typography>
                                    <Typography variant="body2">Bateria: <strong>{v.stateOfCharge ?? 0}%</strong></Typography>
                                    <Typography variant="body2">Status: <strong>{v.status}</strong></Typography>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Markery Stacji Ładowania */}
                    {stations.map((s) => (
                        <Marker key={`station-${s.id}`} position={[s.latitude, s.longitude]} icon={stationIcon}>
                            <Popup>
                                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                                    ⚡ {s.name}
                                </Typography>
                                <Typography variant="body2">Moc: <strong>{s.powerKw} kW</strong></Typography>
                                <Typography variant="body2">Operator: <strong>{s.operator || 'N/A'}</strong></Typography>
                                <Box mt={1}>
                                    <Chip
                                        label={s.available ? 'Dostępna' : 'Zajęta'}
                                        color={s.available ? 'success' : 'error'}
                                        size="small"
                                    />
                                </Box>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Polilinia wyznaczonej trasy */}
                    {routeGeometry && (
                        <Polyline positions={routeGeometry} color="#1976d2" weight={5} opacity={0.8} />
                    )}
                </MapContainer>
            </Box>
        </Paper>
    );
}