import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function NotificationsView({ notifications }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5">Powiadomienia Systemowe</Typography>
            {notifications.map((n, i) => (
                <Alert key={i} severity={n.type === 'SOS' ? 'error' : 'info'} sx={{ fontSize: '1.1rem' }}>
                    <strong>{n.date}</strong> {n.message}
                </Alert>
            ))}
        </Box>
    );
}