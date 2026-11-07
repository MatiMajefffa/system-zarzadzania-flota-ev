import React from 'react';
import { Box, Typography, Alert, Chip } from '@mui/material';

export default function NotificationsView({ notifications }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5">Powiadomienia i Zgłoszenia Systemowe</Typography>

            {notifications.length === 0 ? (
                <Typography color="textSecondary">Brak nowych powiadomień i zgłoszeń.</Typography>
            ) : (
                notifications.map((n, i) => (
                    <Alert
                        key={n.id || i}
                        severity={n.type === 'SOS' ? 'error' : 'info'}
                        sx={{ fontSize: '1.1rem', alignItems: 'center' }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 2 }}>
                            <span>
                                <strong>{n.createdAt ? new Date(n.createdAt).toLocaleString() : (n.date || 'Dzisiaj')}</strong>: {n.description || n.message}
                            </span>
                            {n.vehicleRegistration && (
                                <Chip label={`Auto: ${n.vehicleRegistration}`} size="small" variant="outlined" />
                            )}
                        </Box>
                    </Alert>
                ))
            )}
        </Box>
    );
}