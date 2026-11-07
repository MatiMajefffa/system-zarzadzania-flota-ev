import React from 'react';
import { Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Button } from '@mui/material';

export default function RoutesView({ vehicles, routeForm, setRouteForm, handleCalculateRoute }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5">Ręczne Planowanie Tras</Typography>
            <Paper sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Wybierz pojazd</InputLabel>
                            <Select value={routeForm.vehicleId} label="Wybierz pojazd" onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })}>
                                {vehicles.map(v => <MenuItem key={v.id} value={v.id}>{v.registrationNumber} - {v.model}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Skąd" value={routeForm.startAddress} onChange={(e) => setRouteForm({ ...routeForm, startAddress: e.target.value })} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Dokąd" value={routeForm.endAddress} onChange={(e) => setRouteForm({ ...routeForm, endAddress: e.target.value })} /></Grid>
                    <Grid item xs={12}><Button variant="contained" onClick={handleCalculateRoute}>Oblicz Trasę</Button></Grid>
                </Grid>
            </Paper>
        </Box>
    );
}