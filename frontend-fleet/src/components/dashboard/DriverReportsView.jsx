import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Paper, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';

const MAX_DESCRIPTION_LENGTH = 1000;

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
});

const STATUS_LABELS = { NIEODCZYTANY: 'Nowe', ODCZYTANY: 'Odczytane przez menedżera' };

export default function DriverReportsView({ canReport }) {
    const [reports, setReports] = useState([]);
    const [description, setDescription] = useState('');
    const [editing, setEditing] = useState({ id: null, text: '' });
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState({ text: '', type: 'info' });

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/reports/mine', { headers: authHeaders() });
            if (response.ok) setReports(await response.json());
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Wspólna obsługa żądań: pokazuje wynik i odświeża historię; zwraca true po powodzeniu
    const send = async (url, method, body, successText) => {
        setSending(true);
        try {
            const response = await fetch(url, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
            if (!response.ok) {
                setFeedback({ text: (await response.text()) || 'Nie udało się wykonać operacji.', type: 'error' });
                return false;
            }
            setFeedback({ text: successText, type: 'success' });
            fetchReports();
            return true;
        } catch (err) {
            console.error(err);
            setFeedback({ text: 'Błąd połączenia z serwerem.', type: 'error' });
            return false;
        } finally {
            setSending(false);
        }
    };

    const handleCreate = async () => {
        if (await send('/api/reports', 'POST', { description }, 'Zgłoszenie wysłane.')) setDescription('');
    };

    const handleUpdate = async () => {
        if (await send(`/api/reports/mine/${editing.id}`, 'PUT', { description: editing.text }, 'Zgłoszenie zmienione.')) {
            setEditing({ id: null, text: '' });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Czy na pewno chcesz usunąć to zgłoszenie?')) {
            send(`/api/reports/mine/${id}`, 'DELETE', null, 'Zgłoszenie usunięte.');
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
            <Typography variant="h5">Zgłoszenia</Typography>

            {feedback.text && <Alert severity={feedback.type} onClose={() => setFeedback({ text: '', type: 'info' })}>{feedback.text}</Alert>}

            {canReport ? (
                <Paper sx={{ p: 3, borderTop: '4px solid #d32f2f' }}>
                    <Typography variant="h6" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon /> Formularz Zgłoszeń i Usterek
                    </Typography>
                    <TextField
                        fullWidth multiline rows={3} label="Szczegóły problemu na trasie" value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH } }} sx={{ mb: 2 }}
                    />
                    <Button variant="contained" color="error" onClick={handleCreate} disabled={sending || !description.trim()}>
                        Wyślij zgłoszenie
                    </Button>
                </Paper>
            ) : (
                <Alert severity="info">Formularz zgłoszeń będzie dostępny po odebraniu auta i wysłaniu jego zdjęcia.</Alert>
            )}

            <Typography variant="h6">Historia moich zgłoszeń</Typography>
            {reports.length === 0 && <Typography color="text.secondary">Nie masz jeszcze żadnych zgłoszeń.</Typography>}

            {reports.map((report) => {
                const isEditing = editing.id === report.id;
                const isEditable = report.type !== 'SOS';
                return (
                    <Paper key={report.id} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2">{new Date(report.createdAt).toLocaleString('pl-PL')}</Typography>
                            {report.type === 'SOS' && <Chip size="small" color="error" label="SOS" />}
                            {report.vehicleRegistration && <Chip size="small" variant="outlined" label={`Auto: ${report.vehicleRegistration}`} />}
                            <Chip size="small" variant="outlined" label={STATUS_LABELS[report.status] ?? report.status} />
                        </Box>

                        {isEditing ? (
                            <TextField
                                fullWidth multiline rows={3} value={editing.text}
                                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                                slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH } }}
                            />
                        ) : (
                            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.description}</Typography>
                        )}

                        {isEditable && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {isEditing ? (
                                    <>
                                        <Button size="small" variant="contained" onClick={handleUpdate} disabled={sending || !editing.text.trim()}>Zapisz</Button>
                                        <Button size="small" onClick={() => setEditing({ id: null, text: '' })}>Anuluj</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="small" variant="outlined" onClick={() => setEditing({ id: report.id, text: report.description })}>Edytuj</Button>
                                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(report.id)} disabled={sending}>Usuń</Button>
                                    </>
                                )}
                            </Box>
                        )}
                    </Paper>
                );
            })}
        </Box>
    );
}
