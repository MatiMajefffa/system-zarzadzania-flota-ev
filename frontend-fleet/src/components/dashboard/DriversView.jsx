import React from 'react';
import { Box, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

export default function DriversView({ drivers, assignRouteDialog, setAssignRouteDialog, handleAssignRouteToDriver }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5">Baza Kierowców</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#f0f2f5' }}>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Imię i Nazwisko / Email</strong></TableCell>
                            <TableCell><strong>Ostatnia Trasa</strong></TableCell>
                            <TableCell align="right"><strong>Akcje</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {drivers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">Brak zarejestrowanych kierowców w systemie.</TableCell>
                            </TableRow>
                        ) : (
                            drivers.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.id}</TableCell>
                                    <TableCell>{d.firstName ? `${d.firstName} ${d.lastName}` : d.email}</TableCell>
                                    <TableCell>{d.lastRoute || 'Brak aktywnej trasy'}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={() => setAssignRouteDialog({ open: true, driverId: d.id, start: '', end: '' })}>
                                            Zleć Trasę
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={assignRouteDialog.open} onClose={() => setAssignRouteDialog({ ...assignRouteDialog, open: false })}>
                <DialogTitle>Zleć trasę kierowcy #{assignRouteDialog.driverId}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth size="small" label="Skąd" sx={{ mt: 2, mb: 2 }} value={assignRouteDialog.start} onChange={e => setAssignRouteDialog({ ...assignRouteDialog, start: e.target.value })} />
                    <TextField fullWidth size="small" label="Dokąd" value={assignRouteDialog.end} onChange={e => setAssignRouteDialog({ ...assignRouteDialog, end: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignRouteDialog({ ...assignRouteDialog, open: false })}>Anuluj</Button>
                    <Button variant="contained" onClick={handleAssignRouteToDriver}>Wyślij Zlecenie</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}