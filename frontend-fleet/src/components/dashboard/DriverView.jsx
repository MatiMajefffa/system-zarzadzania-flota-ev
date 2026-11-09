import React from 'react';
import {
    Box, Typography, Button, TextField, Paper, Alert, Grid,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import NavigationIcon from '@mui/icons-material/Navigation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

const formatDuration = (minutes) => {
    if (minutes == null) return '—';
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};

export default function DriverView({
                                       message, setMessage, tripStage, lastRoute, routeHistory,
                                       loading, routeResult, photos, handlePhotoUpload,
                                       isNavigating, setIsNavigating, handleFinishRoute, handleReturnVehicle,
                                       currentLocation, routeWaypoints, routePath, reportForm, setReportForm,
                                       handleReportDamage, handleSOS, carIcon, RouteBoundsController, NavigationController,
                                       newRouteNotification, onOpenNotifications, handleStartAssignedRoute
                                   }) {
    const assignedRoute = lastRoute?.status === 'ZLECONA' ? lastRoute : null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {message.text && <Alert severity={message.type} onClose={() => setMessage({ text: '' })}>{message.text}</Alert>}

            {newRouteNotification && (
                <Alert
                    severity="info"
                    action={<Button color="inherit" size="small" onClick={onOpenNotifications}>Zobacz</Button>}
                >
                    {newRouteNotification.description}
                </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">Panel Kierowcy - Zlecenia i Trasy</Typography>
                {tripStage === 'EN_ROUTE' && (
                    <Button variant="contained" color="error" size="large" startIcon={<LocalHospitalIcon />} onClick={handleSOS} sx={{ animation: 'pulse 2s infinite' }}>
                        SOS - WEZWIJ POMOC
                    </Button>
                )}
            </Box>

            {tripStage === 'IDLE' && (
                <Grid container spacing={3}>
                    {/* Sekcja wyświetlająca przypisaną trasę od menedżera */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 3, height: '100%', borderTop: '4px solid #1976d2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h6" gutterBottom color="primary">
                                    📋 Przypisane Zlecenie
                                </Typography>
                                {assignedRoute ? (
                                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant="body2"><b>Skąd (Start):</b> {assignedRoute.startAddress || 'Baza'}</Typography>
                                        <Typography variant="body2"><b>Dokąd (Cel):</b> {assignedRoute.endAddress || 'Nieznane'}</Typography>
                                        <Typography variant="body2"><b>Pojazd:</b> {assignedRoute.vehicleRegistrationNumber || 'Przydzielony'}</Typography>
                                        <Typography variant="body2"><b>Dystans:</b> {assignedRoute.distanceKm ? assignedRoute.distanceKm.toFixed(2) : '?'} km</Typography>
                                        <Typography variant="body2"><b>Wymagana energia:</b> {assignedRoute.energyRequiredKWh ? assignedRoute.energyRequiredKWh.toFixed(1) : '?'} kWh</Typography>
                                        {assignedRoute.chargingStops.map((stop, index) => (
                                            <Typography key={`${stop.name}-${index}`} variant="body2">
                                                <b>Postój {index + 1}:</b> {stop.name}, ładowanie ok. {Math.ceil(stop.chargingMinutes)} min
                                            </Typography>
                                        ))}
                                        <Button variant="contained" startIcon={<NavigationIcon />} onClick={() => handleStartAssignedRoute(assignedRoute)} sx={{ mt: 1 }}>
                                            Rozpocznij trasę
                                        </Button>
                                    </Box>
                                ) : (
                                    <Typography color="textSecondary" sx={{ mt: 2 }}>
                                        Brak nowych zleceń od menedżera.
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 3, height: '100%', borderTop: '4px solid #2e7d32' }}>
                            <Typography variant="h6" gutterBottom color="success.main">
                                Moje ostatnie trasy
                            </Typography>
                            {routeHistory.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>Skąd</strong></TableCell>
                                                <TableCell><strong>Dokąd</strong></TableCell>
                                                <TableCell align="right"><strong>Czas</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {routeHistory.map((route) => (
                                                <TableRow key={route.id}>
                                                    <TableCell>{route.startAddress}</TableCell>
                                                    <TableCell>{route.endAddress}</TableCell>
                                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatDuration(route.durationMinutes)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography color="textSecondary" sx={{ mt: 2 }}>
                                    Nie masz jeszcze zakończonych tras.
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Aktywny etap podróży (Odbiór -> Trasa -> Zwrot) */}
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
                                <strong>Przypisany Pojazd:</strong> {routeResult.vehicleRegistrationNumber || 'Auto Systemowe'}<br />
                                <strong>Zasięg pojazdu:</strong> ~{routeResult.vehicleRangeKm?.toFixed(0) || '300'} km<br />
                                <strong>Wymagana energia:</strong> {routeResult.energyRequiredKWh?.toFixed(1)} kWh
                            </Alert>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Alert severity="success">
                                <strong>Dystans całkowity:</strong> {routeResult.distanceKm?.toFixed(2) || '50'} km<br />
                                <strong>Baza docelowa na koniec:</strong> {routeResult.returnBaseName || 'Katowice'}
                            </Alert>
                        </Grid>
                    </Grid>

                    <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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

                    {routeWaypoints.start && routeWaypoints.end && (
                        <Box sx={{ height: 450, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #ccc', position: 'relative' }}>
                            <MapContainer center={[routeWaypoints.start.lat, routeWaypoints.start.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {!isNavigating && <RouteBoundsController waypoints={routeWaypoints} />}
                                <NavigationController position={currentLocation} isNavigating={isNavigating} />

                                <Marker position={[routeWaypoints.start.lat, routeWaypoints.start.lng]}><Popup>Start</Popup></Marker>
                                <Marker position={[routeWaypoints.end.lat, routeWaypoints.end.lng]}><Popup>Cel</Popup></Marker>
                                {routeWaypoints.stops.map((stop, index) => (
                                    <Marker key={`stop-${index}`} position={[stop.lat, stop.lng]}>
                                        <Popup>Postój ładowania {index + 1}: {stop.name}</Popup>
                                    </Marker>
                                ))}

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

            {/* Formularz zgłaszania usterek */}
            <Paper sx={{ p: 3, borderTop: '4px solid #d32f2f', mt: 2 }}>
                <Typography variant="h6" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon /> Formularz Zgłoszeń i Usterek
                </Typography>
                <TextField fullWidth label="Szczegóły problemu na trasie" multiline rows={3} sx={{ mb: 2 }} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} />
                <Button variant="contained" color="error" onClick={handleReportDamage} disabled={loading || !reportForm.description}>Wyślij zgłoszenie</Button>
            </Paper>
        </Box>
    );
}