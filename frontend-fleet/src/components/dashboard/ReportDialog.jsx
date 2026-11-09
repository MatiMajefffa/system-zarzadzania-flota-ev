import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

export default function ReportDialog({ onClose, onSent }) {
    const [description, setDescription] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        setSending(true);
        setError('');
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ description })
            });
            if (response.ok) {
                onSent();
            } else {
                setError((await response.text()) || 'Nie udało się wysłać zgłoszenia.');
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
            <DialogTitle>Zgłoś problem na trasie</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField
                    fullWidth multiline rows={4} autoFocus label="Szczegóły problemu" value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 1000 } }} sx={{ mt: 1 }}
                />
                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Anuluj</Button>
                <Button variant="contained" color="error" onClick={handleSend} disabled={sending || !description.trim()}>
                    {sending ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
