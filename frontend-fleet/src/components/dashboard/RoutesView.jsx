import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Paper, Alert, Divider } from '@mui/material';

export default function RoutesView({ bases = [], onRoutePlanned }) {
    const [startBase, setStartBase] = useState('');
    const [cargoType, setCargoType] = useState('');
    const [destination, setDestination] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onRoutePlanned) {
            onRoutePlanned({ startBase, cargoType, destination });
        }
    };

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%' }}>
                <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                    🧭 Planowanie Trasy i Nawigacja Floty EV
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Wybierz bazę początkową, rodzaj ładunku (system dobierze odpowiedni pojazd elektryczny) oraz cel podróży.
                </Typography>

                <Divider sx={{ mb: 3 }} />

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* 1. Wybór bazy startowej z pobranych z bazy */}
                    <TextField
                        select
                        label="Baza startowa"
                        value={startBase}
                        onChange={(e) => setStartBase(e.target.value)}
                        required
                        helperText="Wybierz bazę, z której rusza pojazd"
                    >
                        {bases.map((base, index) => (
                            <MenuItem key={index} value={base.name || base}>
                                {base.name || base}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* 2. Wybór rodzaju ładunku / przeznaczenia */}
                    <TextField
                        select
                        label="Rodzaj ładunku / przeznaczenia"
                        value={cargoType}
                        onChange={(e) => setCargoType(e.target.value)}
                        required
                        helperText="System automatycznie dobierze odpowiedni typ auta z bazy"
                    >
                        <MenuItem value="OSOBOWY">🚗 Przewóz osób (Auta osobowe / VIP)</MenuItem>
                        <MenuItem value="MALY_DOSTAWCZAK">📦 Przewóz małych paczek (Małe vany)</MenuItem>
                        <MenuItem value="DUZY_DOSTAWCZAK">🚛 Przewóz dużych paczek (Duże vany / Trasy)</MenuItem>
                    </TextField>

                    {/* 3. Miejsce docelowe */}
                    <TextField
                        label="Miejsce docelowe"
                        placeholder="np. Warszawa, ul. Marszałkowska lub Gliwice"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        sx={{ mt: 2, py: 1.5, fontSize: '1rem' }}
                    >
                        🚀 Wyznacz trasę i uruchom nawigację
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}