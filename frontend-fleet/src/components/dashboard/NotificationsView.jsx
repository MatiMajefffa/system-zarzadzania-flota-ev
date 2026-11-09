import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Chip, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function NotificationsView({
                                              notifications: initialNotifications,
                                              apiBasePath = '/api/reports',
                                              title = 'Powiadomienia i Zgłoszenia Systemowe',
                                              onChanged
                                          }) {
    const [notifications, setNotifications] = useState(initialNotifications);
    const token = localStorage.getItem('token');

    useEffect(() => {
        setNotifications(initialNotifications);
    }, [initialNotifications]);

    // Obsługa zmiany statusu na odczytany (używamy tej samej konwencji co sprawdzony fetch/axios)
    const handleMarkAsRead = async (id) => {
        try {
            // Używamy względnej ścieżki /api/... (takiej samej, jak przy usuwaniu, jeśli działało)
            const response = await fetch(`${apiBasePath}/${id}/status?status=ODCZYTANY`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Natychmiastowa zmiana statusu w stanie lokalnym -> kropka i napis znikną
                setNotifications(prev =>
                    prev.map(n => String(n.id) === String(id) ? { ...n, status: 'ODCZYTANY' } : n)
                );
                onChanged?.();
            } else {
                console.error("Błąd serwera:", response.status);
            }
        } catch (error) {
            console.error("Błąd połączenia podczas aktualizacji statusu", error);
        }
    };

    // Obsługa natychmiastowego usuwania (skoro usuwanie działa, zostawiamy ten mechanizm)
    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${apiBasePath}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok || response.status === 204) {
                setNotifications(prev => prev.filter(n => String(n.id) !== String(id)));
                onChanged?.();
            }
        } catch (error) {
            console.error("Błąd podczas usuwania powiadomienia", error);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h5">{title}</Typography>

            {notifications.length === 0 ? (
                <Typography color="textSecondary">Brak nowych powiadomień i zgłoszeń.</Typography>
            ) : (
                notifications.map((n, i) => {
                    const status = n.status ? n.status.toUpperCase() : 'NIEODCZYTANY';
                    const isUnread = status === 'NIEODCZYTANY' || status === 'NOWY';
                    const isRead = status === 'ODCZYTANY';

                    return (
                        <Alert
                            key={n.id || i}
                            severity={n.type === 'SOS' ? 'error' : n.type === 'WAZNA_WIADOMOSC' ? 'warning' : 'info'}
                            sx={{
                                fontSize: '1.1rem',
                                alignItems: 'center',
                                opacity: isRead ? 0.6 : 1,
                                backgroundColor: isRead ? 'rgba(0, 0, 0, 0.02)' : 'inherit',
                                position: 'relative'
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Box sx={{ flexGrow: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>

                                    {/* Czerwona kropeczka - znika od razu po kliknięciu przeczytane */}
                                    {isUnread && (
                                        <FiberManualRecordIcon sx={{ color: 'error.main', fontSize: '14px' }} titleAccess="Nieodczytane powiadomienie" />
                                    )}

                                    <span>
                                        <strong>{n.createdAt ? new Date(n.createdAt).toLocaleString() : (n.date || 'Dzisiaj')}</strong>: {n.description || n.message}
                                    </span>

                                    {n.vehicleRegistration && (
                                        <Chip label={`Auto: ${n.vehicleRegistration}`} size="small" variant="outlined" />
                                    )}

                                    {/* Etykieta - zamienia się z "Nieodczytane" na "Odczytane" */}
                                    {isUnread ? (
                                        <Chip label="Nieodczytane" size="small" color="error" />
                                    ) : (
                                        <Chip label="Odczytane" size="small" variant="outlined" />
                                    )}
                                </Box>

                                {/* Przyciski akcji */}
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    {isUnread && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            startIcon={<CheckCircleIcon />}
                                            onClick={() => handleMarkAsRead(n.id)}
                                        >
                                            Przeczytane
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => handleDelete(n.id)}
                                    >
                                        Usuń
                                    </Button>
                                </Box>
                            </Box>
                        </Alert>
                    );
                })
            )}
        </Box>
    );
}