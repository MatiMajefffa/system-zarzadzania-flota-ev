import React, { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    LinearProgress,
    CircularProgress,
    Alert,
    AppBar,
    Toolbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import api from '../api/axios';

export default function Dashboard({ onLogout }) {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchVehicles = async () => {
        setLoading(true);
        setError('');
        try {
            // Wywołanie zabezpieczonego endpointu w Spring Boot
            const response = await api.get('/vehicles');
            setVehicles(response.data);
        } catch (err) {
            setError('Błąd podczas pobierania floty pojazdów.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const getStatusChip = (status) => {
        switch (status) {
            case 'AVAILABLE':
            case 'DOSTEPNY':
                return <Chip label="Dostępny" color="success" size="small" />;
            case 'IN_USE':
            case 'W_TRASIE':
                return <Chip label="W trasie" color="primary" size="small" />;
            case 'CHARGING':
            case 'LADOWANIE':
                return <Chip label="Ładowanie" color="warning" size="small" />;
            default:
                return <Chip label={status || 'Nieznany'} size="small" />;
        }
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                        System Floty EV – Panel Zarządzania
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        ID Pracownika: <strong>{localStorage.getItem('employeeId')}</strong>
                    </Typography>
                    <Button color="error" variant="outlined" startIcon={<LogoutIcon />} onClick={onLogout}>
                        Wyloguj
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight="bold">
                        Flota Pojazdów Elektrycznych
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={fetchVehicles}
                        disabled={loading}
                    >
                        Odśwież
                    </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Paper elevation={2}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell><strong>ID</strong></TableCell>
                                    <TableCell><strong>Marka i Model</strong></TableCell>
                                    <TableCell><strong>Nr Rejestracyjny</strong></TableCell>
                                    <TableCell><strong>Bateria (SoC)</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : vehicles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            Brak pojazdów w bazie danych.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    vehicles.map((v) => (
                                        <TableRow key={v.id} hover>
                                            <TableCell>{v.id}</TableCell>
                                            <TableCell>{v.brand} {v.model}</TableCell>
                                            <TableCell>{v.registrationNumber}</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>
                                                <Box display="flex" alignItems="center">
                                                    <Box width="100%" mr={1}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={v.batteryLevel || 0}
                                                            color={v.batteryLevel < 20 ? 'error' : v.batteryLevel < 50 ? 'warning' : 'success'}
                                                            sx={{ height: 8, borderRadius: 5 }}
                                                        />
                                                    </Box>
                                                    <Typography variant="body2" color="textSecondary">{`${v.batteryLevel || 0}%`}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{getStatusChip(v.status)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>
        </Box>
    );
}