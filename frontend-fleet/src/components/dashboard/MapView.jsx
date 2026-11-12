import React from 'react';
import { Box, Paper, TextField, Button, Alert } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function MapView({
                                    userRole, handleSync, loading, searchAddress, setSearchAddress,
                                    handleSearchByAddress, radiusKm, setRadiusKm, message, centerCoords,
                                    stations, bases, baseIcon, MapController
                                }) {
    return (
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

            <Paper sx={{ height: 'calc(100vh - 200px)', minHeight: '500px', borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer center={[centerCoords.lat, centerCoords.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={centerCoords} />

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
}