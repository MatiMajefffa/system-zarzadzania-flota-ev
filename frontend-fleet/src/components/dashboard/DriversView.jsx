import React, { useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
    Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import RouteStatusChip from './RouteStatusChip';
import RoutePlanDetails from './RoutePlanDetails';

const NO_BASE_LABEL = 'Bez przypisanej bazy';
const MAX_MESSAGE_LENGTH = 900;

const formatTime = (value) => new Date(value).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

const getDriverName = (driver) => (driver.firstName ? `${driver.firstName} ${driver.lastName}` : driver.email);

function AssignRouteDialog({ driver, defaultBase, bases, routeResult, message, loading, onPlanRoute, onAssignRoute, onClose, onAssigned }) {
    const [startBase, setStartBase] = useState(defaultBase);
    const [cargoType, setCargoType] = useState('');
    const [destination, setDestination] = useState('');
    const [planned, setPlanned] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState('');

    const handlePlan = async () => {
        setError('');
        setPlanned(false);
        await onPlanRoute({ startBase, cargoType, destination });
        setPlanned(true);
    };

    const handleAssign = async () => {
        setAssigning(true);
        setError('');
        const assignError = await onAssignRoute(driver.id);
        setAssigning(false);
        if (assignError) {
            setError(assignError);
        } else {
            onAssigned();
        }
    };

    const updateField = (setter) => (e) => {
        setter(e.target.value);
        setPlanned(false); // Zmiana danych unieważnia wyznaczoną trasę
    };

    const plannedRoute = planned ? routeResult : null;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Zleć trasę: {getDriverName(driver)}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select fullWidth size="small" label="Baza startowa" value={startBase} onChange={updateField(setStartBase)} sx={{ mt: 1 }}>
                    {bases.map((base) => <MenuItem key={base.id} value={base.name}>{base.name}</MenuItem>)}
                </TextField>
                <TextField select fullWidth size="small" label="Rodzaj ładunku / pojazdu" value={cargoType} onChange={updateField(setCargoType)}>
                    <MenuItem value="OSOBOWY">🚗 Przewóz osób (Osobowe)</MenuItem>
                    <MenuItem value="MALY_DOSTAWCZAK">📦 Małe paczki (Małe vany)</MenuItem>
                    <MenuItem value="DUZY_DOSTAWCZAK">🚛 Duże paczki (Duże vany)</MenuItem>
                </TextField>
                <TextField fullWidth size="small" label="Miejsce docelowe" placeholder="np. Warszawa, ul. Marszałkowska" value={destination} onChange={updateField(setDestination)} />

                {planned && message.text && !plannedRoute && <Alert severity={message.type}>{message.text}</Alert>}
                {error && <Alert severity="error">{error}</Alert>}
                {plannedRoute && (
                    <Alert severity="success">
                        <RoutePlanDetails route={plannedRoute} />
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Anuluj</Button>
                {plannedRoute ? (
                    <Button variant="contained" color="success" onClick={handleAssign} disabled={assigning}>
                        {assigning ? 'Zlecanie...' : 'Zleć trasę'}
                    </Button>
                ) : (
                    <Button variant="contained" onClick={handlePlan} disabled={loading || !startBase || !cargoType || !destination.trim()}>
                        {loading ? 'Wyznaczanie...' : 'Wyznacz trasę'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

function SendMessageDialog({ driver, onClose, onSent }) {
    const [text, setText] = useState('');
    const [important, setImportant] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        setSending(true);
        setError('');
        try {
            const response = await fetch('/api/driver-notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ employeeId: driver.id, message: text, important })
            });
            if (response.ok) {
                onSent();
            } else {
                setError(await response.text());
            }
        } catch (err) {
            console.error(err);
            setError('Błąd połączenia z serwerem.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Wiadomość do: {getDriverName(driver)}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField
                    fullWidth multiline rows={4} label="Treść wiadomości lub notatki" value={text}
                    onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: MAX_MESSAGE_LENGTH } }} sx={{ mt: 1 }}
                />
                <FormControlLabel
                    control={<Checkbox checked={important} onChange={(e) => setImportant(e.target.checked)} />}
                    label="Oznacz jako ważne"
                />
                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Anuluj</Button>
                <Button variant="contained" onClick={handleSend} disabled={sending || !text.trim()}>
                    {sending ? 'Wysyłanie...' : 'Wyślij'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function DriversView({ drivers, bases, activeRoutes, message, loading, routeResult, onPlanRoute, onAssignRoute }) {
    const [onlyActive, setOnlyActive] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null);
    const [messageTarget, setMessageTarget] = useState(null);
    const [feedback, setFeedback] = useState('');

    const routeByDriver = new Map(activeRoutes.map((route) => [String(route.employeeId), route]));
    const getRoute = (driver) => routeByDriver.get(String(driver.id));
    const getBase = (driver) => bases.find((base) => Number(base.id) === Number(driver.baseId));
    const getCity = (driver) => getBase(driver)?.name.replace(/^Baza\s+/i, '') ?? NO_BASE_LABEL;

    const routes = drivers.map(getRoute).filter(Boolean);
    const onTheRoad = routes.filter((route) => route.status === 'W_TRAKCIE' && !route.arrivedAt).length;
    const returning = routes.filter((route) => route.arrivedAt).length;
    const waiting = routes.filter((route) => route.status === 'ZLECONA').length;

    const visibleDrivers = onlyActive ? drivers.filter(getRoute) : drivers;
    const groups = new Map();
    visibleDrivers.forEach((driver) => {
        const city = getCity(driver);
        groups.set(city, [...(groups.get(city) ?? []), driver]);
    });
    const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
        if (a === NO_BASE_LABEL) return 1;
        if (b === NO_BASE_LABEL) return -1;
        return a.localeCompare(b, 'pl');
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
            <Typography variant="h5">Kierowcy i zlecenia</Typography>

            {feedback && <Alert severity="success" onClose={() => setFeedback('')}>{feedback}</Alert>}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip color="success" label={`W trasie: ${onTheRoad}`} />
                <Chip color="info" label={`Powrót do bazy: ${returning}`} />
                <Chip color="warning" label={`Oczekuje na rozpoczęcie: ${waiting}`} />
                <Chip variant="outlined" label={`Wolni: ${drivers.length - routes.length}`} />
                <Box sx={{ flexGrow: 1 }} />
                <FormControlLabel
                    control={<Switch checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />}
                    label="Tylko z aktywnym zleceniem"
                />
            </Box>

            {sortedGroups.length === 0 && (
                <Typography color="text.secondary">
                    {onlyActive ? 'Żaden kierowca nie ma teraz aktywnego zlecenia.' : 'Brak zarejestrowanych kierowców w systemie.'}
                </Typography>
            )}

            {sortedGroups.map(([city, cityDrivers]) => (
                <Paper key={city} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>{city} ({cityDrivers.length})</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Kierowca</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Pojazd</strong></TableCell>
                                    <TableCell><strong>Odbiór auta</strong></TableCell>
                                    <TableCell><strong>Trasa</strong></TableCell>
                                    <TableCell align="right"><strong>Akcje</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[...cityDrivers]
                                    .sort((a, b) => getDriverName(a).localeCompare(getDriverName(b), 'pl', { numeric: true }))
                                    .map((driver) => {
                                        const route = getRoute(driver);
                                        return (
                                            <TableRow key={driver.id}>
                                                <TableCell>
                                                    {getDriverName(driver)}
                                                    <Typography variant="caption" color="text.secondary" display="block">ID: {driver.id}</Typography>
                                                </TableCell>
                                                <TableCell>{route ? <RouteStatusChip route={route} /> : <Chip size="small" variant="outlined" label="Wolny" />}</TableCell>
                                                <TableCell>{route?.vehicleRegistrationNumber ?? '—'}</TableCell>
                                                <TableCell>{!route ? '—' : route.startedAt ? `Tak, ${formatTime(route.startedAt)}` : 'Jeszcze nie'}</TableCell>
                                                <TableCell>{route ? `${route.startAddress} → ${route.endAddress}` : '—'}</TableCell>
                                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                    <Button size="small" startIcon={<MailOutlineIcon />} onClick={() => setMessageTarget(driver)} sx={{ mr: 1 }}>
                                                        Wiadomość
                                                    </Button>
                                                    <Button
                                                        size="small" variant="outlined" startIcon={<AssignmentIcon />}
                                                        disabled={Boolean(route)}
                                                        title={route ? 'Ten kierowca ma już aktywne zlecenie' : undefined}
                                                        onClick={() => setAssignTarget(driver)}
                                                    >
                                                        Zleć trasę
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ))}

            {assignTarget && (
                <AssignRouteDialog
                    driver={assignTarget}
                    defaultBase={getBase(assignTarget)?.name ?? ''}
                    bases={bases}
                    routeResult={routeResult}
                    message={message}
                    loading={loading}
                    onPlanRoute={onPlanRoute}
                    onAssignRoute={onAssignRoute}
                    onClose={() => setAssignTarget(null)}
                    onAssigned={() => {
                        setFeedback(`Trasa została zlecona: ${getDriverName(assignTarget)}.`);
                        setAssignTarget(null);
                    }}
                />
            )}

            {messageTarget && (
                <SendMessageDialog
                    driver={messageTarget}
                    onClose={() => setMessageTarget(null)}
                    onSent={() => {
                        setFeedback(`Wiadomość wysłana: ${getDriverName(messageTarget)}.`);
                        setMessageTarget(null);
                    }}
                />
            )}
        </Box>
    );
}
