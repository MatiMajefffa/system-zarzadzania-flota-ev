import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, Paper, Alert, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, Grid, TextField, FormControl, InputLabel,
    Select, MenuItem, Switch, FormControlLabel, Divider, List, ListItem, ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const VEHICLE_TYPE_LABELS = { OSOBOWY: 'Osobowy', MALY_DOSTAWCZAK: 'Mały dostawczy', DUZY_DOSTAWCZAK: 'Duży dostawczy' };
const ROUTE_STATUS_LABELS = { ZLECONA: 'Oczekuje na rozpoczęcie', W_TRAKCIE: 'W trakcie', ZAKONCZONA: 'Zakończona' };

const formatDate = (value) => new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });

function RouteSummary({ title, route }) {
    return (
        <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}><strong>{title}</strong></Typography>
            {route ? (
                <>
                    <Typography variant="body2">{route.startAddress} → {route.endAddress}</Typography>
                    <Typography variant="body2">Kierowca: {route.driverName}</Typography>
                    <Typography variant="body2">Status: {ROUTE_STATUS_LABELS[route.status] ?? route.status}</Typography>
                    {route.distanceKm != null && <Typography variant="body2">Dystans: {route.distanceKm.toFixed(1)} km</Typography>}
                    {route.startedAt && <Typography variant="body2">Odbiór auta: {formatDate(route.startedAt)}</Typography>}
                    {route.drivingMinutes != null && <Typography variant="body2">Czas dojazdu: {route.drivingMinutes} min</Typography>}
                </>
            ) : (
                <Typography variant="body2" color="text.secondary">Brak</Typography>
            )}
        </>
    );
}

function VehicleSettingsForm({ vehicle, onSave }) {
    const [vehicleType, setVehicleType] = useState(vehicle.vehicleType ?? '');
    const [status, setStatus] = useState(vehicle.status);
    const isEditable = vehicle.status === 'DOSTEPNY' || vehicle.status === 'SERWIS';
    const isChanged = vehicleType !== (vehicle.vehicleType ?? '') || status !== vehicle.status;

    if (!isEditable) {
        return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Typ i status można zmienić, gdy auto nie jest w trasie ani się nie ładuje.</Typography>;
    }

    return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 2 }}>
            <TextField select size="small" label="Typ pojazdu" sx={{ minWidth: 170 }} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Status" sx={{ minWidth: 130 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="DOSTEPNY">Dostępny</MenuItem>
                <MenuItem value="SERWIS">Serwis</MenuItem>
            </TextField>
            <Button variant="contained" size="small" disabled={!vehicleType || !isChanged} onClick={() => onSave(vehicle.id, { vehicleType, status })}>
                Zapisz
            </Button>
        </Box>
    );
}

export default function VehiclesView({
                                         message, setMessage, showVehicleForm, setShowVehicleForm, newVehicle,
                                         setNewVehicle, bases, handleAddVehicle, loading, vehicles, setSelectedVehicle,
                                         setShowVehicleDetails, showVehicleDetails, selectedVehicle: selectedVehicleSnapshot, handleToggleBlockVehicle,
                                         deleteCode, setDeleteCode, handleDeleteVehicle, baseIcon, handleStartCharging, handleUpdateVehicleSettings
                                     }) {
    // Lista odświeża się w tle, więc szczegóły pokazują aktualną baterię i przebieg
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleSnapshot?.id) ?? selectedVehicleSnapshot;
    const [details, setDetails] = useState(null);

    useEffect(() => {
        if (!showVehicleDetails || !selectedVehicle?.id) return undefined;

        let isCurrent = true;
        fetch(`/api/vehicles/${selectedVehicle.id}/details`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => { if (isCurrent) setDetails(data); })
            .catch(console.error);
        return () => {
            isCurrent = false;
            setDetails(null);
        };
    }, [showVehicleDetails, selectedVehicle?.id, selectedVehicle?.status]);

    const formatMileage = (vehicle) => `${Math.round(vehicle.totalMileage ?? 0).toLocaleString('pl-PL')} km`;

    const getStatusLabel = (vehicle) => {
        if (vehicle.isBlocked) return 'ZABLOKOWANY';
        if (vehicle.status === 'LADOWANIE' && vehicle.chargingEndsAt) {
            return `Ładowanie do ${new Date(vehicle.chargingEndsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return vehicle.status;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {message.text && <Alert severity={message.type} onClose={() => setMessage({ text: '' })}>{message.text}</Alert>}

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
                        <TextField required label="Nr rejestracyjny" size="small" value={newVehicle.registrationNumber} onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })} />
                        <TextField required label="Model" size="small" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} />
                        <TextField
                            required select label="Typ pojazdu" size="small" sx={{ minWidth: 200 }} value={newVehicle.vehicleType}
                            onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                        >
                            {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField>
                        <TextField required label="Bateria (kWh)" type="number" size="small" slotProps={{ htmlInput: { min: 1, step: 'any' } }} value={newVehicle.batteryCapacityKWh} onChange={(e) => setNewVehicle({ ...newVehicle, batteryCapacityKWh: e.target.value })} />
                        <TextField required label="Naładowanie (%)" type="number" size="small" slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }} value={newVehicle.stateOfCharge} onChange={(e) => setNewVehicle({ ...newVehicle, stateOfCharge: e.target.value })} />
                        <TextField required label="Przebieg (km)" type="number" size="small" slotProps={{ htmlInput: { min: 0, step: 'any' } }} value={newVehicle.totalMileage} onChange={(e) => setNewVehicle({ ...newVehicle, totalMileage: e.target.value })} />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={newVehicle.status} label="Status" onChange={(e) => setNewVehicle({ ...newVehicle, status: e.target.value })}>
                                <MenuItem value="DOSTEPNY">Dostępny</MenuItem>
                                <MenuItem value="SERWIS">Serwis</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 200 }} required>
                            <InputLabel>Baza / Miejsce postoju</InputLabel>
                            <Select value={newVehicle.currentBase} label="Baza / Miejsce postoju" onChange={(e) => setNewVehicle({ ...newVehicle, currentBase: e.target.value })}>
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
                            <TableCell><strong>Przebieg</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Szczegóły</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vehicles.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center">Brak pojazdów.</TableCell></TableRow>
                        ) : (
                            vehicles.map((v) => (
                                <TableRow key={v.id} sx={{ opacity: v.isBlocked ? 0.5 : 1 }}>
                                    <TableCell>{v.id}</TableCell>
                                    <TableCell>{v.registrationNumber}</TableCell>
                                    <TableCell>{v.model}</TableCell>
                                    <TableCell>{v.batteryCapacityKWh} kWh / {v.stateOfCharge}%</TableCell>
                                    <TableCell>{formatMileage(v)}</TableCell>
                                    <TableCell>{getStatusLabel(v)}</TableCell>
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
                                    <Typography variant="subtitle1"><strong>Przebieg całkowity:</strong> {formatMileage(selectedVehicle)}</Typography>
                                    <Typography variant="subtitle1"><strong>Aktualna Baza:</strong> {selectedVehicle.currentBase || 'Katowice'}</Typography>
                                    <Typography variant="subtitle1"><strong>Bateria:</strong> {selectedVehicle.stateOfCharge}%</Typography>
                                    <Typography variant="subtitle1"><strong>Status:</strong> {getStatusLabel(selectedVehicle)}</Typography>
                                    {details && (
                                        <>
                                            <Typography variant="subtitle1"><strong>Typ:</strong> {VEHICLE_TYPE_LABELS[details.vehicleType] ?? 'Nie określono'}</Typography>
                                            <Typography variant="subtitle1"><strong>Szacowany zasięg:</strong> {Math.round(details.estimatedRangeKm)} km</Typography>
                                            <Typography variant="subtitle1"><strong>Zakończone trasy:</strong> {details.finishedRoutes}</Typography>
                                        </>
                                    )}
                                    <VehicleSettingsForm
                                        key={`${selectedVehicle.id}-${selectedVehicle.status}-${selectedVehicle.vehicleType}`}
                                        vehicle={selectedVehicle}
                                        onSave={handleUpdateVehicleSettings}
                                    />
                                    <Button
                                        variant="outlined"
                                        sx={{ mt: 1 }}
                                        disabled={selectedVehicle.status !== 'DOSTEPNY' || selectedVehicle.stateOfCharge >= 100}
                                        onClick={() => handleStartCharging(selectedVehicle.id)}
                                    >
                                        Naładuj w bazie
                                    </Button>

                                    <FormControlLabel
                                        control={<Switch checked={selectedVehicle.isBlocked || false} onChange={() => handleToggleBlockVehicle(selectedVehicle.id)} color="error" />}
                                        label="Wyklucz z algorytmu (Zablokuj)"
                                        sx={{ mt: 2 }}
                                    />
                                    {selectedVehicle.isBlocked && (
                                        <Box sx={{ mt: 3, p: 2, border: '1px dashed #d32f2f', borderRadius: 2, backgroundColor: '#fff5f5' }}>
                                            <Typography variant="subtitle2" color="error" gutterBottom>
                                                Strefa niebezpieczna (Usuwanie pojazdu)
                                            </Typography>
                                            <TextField
                                                size="small"
                                                type="password"
                                                label="Wpisz kod (np. 6969)"
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
                                    <RouteSummary title="Aktualne zlecenie" route={details?.activeRoute} />
                                    <RouteSummary title="Ostatnia zakończona trasa" route={details?.lastRoute} />
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" color="error">Notatki i Zgłoszenia:</Typography>
                                    <List dense>
                                        {details?.reports?.length > 0 ? (
                                            details.reports.map((report, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={report.description}
                                                        secondary={`${formatDate(report.createdAt)}, ID pracownika: ${report.employeeId || 'Nieznany'}${report.type === 'SOS' ? ', SOS' : ''}`}
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
}