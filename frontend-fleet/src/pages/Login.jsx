import React, { useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Alert, Link, CircularProgress
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const Login = () => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false); // NOWY STAN: tryb odzyskiwania ID
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Stan formularza
    const [formData, setFormData] = useState({
        employeeId: '',
        email: '',
        password: '',
        firstname: '',
        lastname: '',
        secretCode: ''
    });

    const [recoveryEmail, setRecoveryEmail] = useState(''); // Email do odzyskiwania ID

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setIsRecoveryMode(false);
        setMessage({ text: '', type: '' });
        setFormData({ employeeId: '', email: '', password: '', firstname: '', lastname: '', secretCode: '' });
    };

    const toggleRecoveryMode = () => {
        setIsRecoveryMode(!isRecoveryMode);
        setIsRegisterMode(false);
        setMessage({ text: '', type: '' });
        setRecoveryEmail('');
    };

    // Obsługa logowania i rejestracji
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

        const payload = isRegisterMode
            ? {
                firstname: formData.firstname,
                lastname: formData.lastname,
                email: formData.email,
                password: formData.password,
                secretCode: formData.secretCode
            }
            : {
                employeeId: parseInt(formData.employeeId, 10),
                password: formData.password
            };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    if (data.employeeId) {
                        localStorage.setItem('employeeId', data.employeeId);
                    }
                    window.location.href = '/';
                }
            } else {
                setMessage({
                    text: isRegisterMode ? 'Rejestracja nie powiodła się. Sprawdź dane.' : 'Błędne ID pracownika lub hasło.',
                    type: 'error'
                });
            }
        } catch (error) {
            setMessage({ text: 'Błąd połączenia z serwerem.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // NOWA FUNKCJA: Obsługa żądania odzyskania ID po adresie email
    const handleRecoverId = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`/api/auth/get-id-by-email?email=${encodeURIComponent(recoveryEmail)}`);
            if (response.ok) {
                const data = await response.json();
                setMessage({
                    text: `Sukces! Twoje ID pracownika dla adresu ${recoveryEmail} to: ${data.employeeId}`,
                    type: 'success'
                });
            } else {
                setMessage({ text: 'Nie znaleziono użytkownika z takim adresem e-mail.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Błąd połączenia z serwerem.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f4f6f9'
            }}
        >
            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
                <DirectionsCarIcon sx={{ fontSize: 60, color: '#1a237e', mb: 1 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    EV Fleet System
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                    {isRecoveryMode
                        ? 'Odzyskiwanie ID pracownika'
                        : (isRegisterMode ? 'Utwórz nowe konto' : 'Zaloguj się do panelu')}
                </Typography>

                {message.text && (
                    <Alert severity={message.type} sx={{ mb: 2 }}>
                        {message.text}
                    </Alert>
                )}

                {/* FORMULARZ ODZYSKIWANIA ID */}
                {isRecoveryMode ? (
                    <Box component="form" onSubmit={handleRecoverId} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Podaj adres E-mail"
                            type="email"
                            required
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            size="small"
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            sx={{ mt: 1, backgroundColor: '#1a237e' }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sprawdź ID'}
                        </Button>
                    </Box>
                ) : (
                    /* FORMULARZ LOGOWANIA / REJESTRACJI */
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {isRegisterMode ? (
                            <>
                                <TextField
                                    label="Imię"
                                    name="firstname"
                                    required
                                    value={formData.firstname}
                                    onChange={handleChange}
                                    size="small"
                                />
                                <TextField
                                    label="Nazwisko"
                                    name="lastname"
                                    required
                                    value={formData.lastname}
                                    onChange={handleChange}
                                    size="small"
                                />
                                <TextField
                                    label="Adres E-mail"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    size="small"
                                />
                            </>
                        ) : (
                            <TextField
                                label="ID Pracownika"
                                name="employeeId"
                                type="number"
                                required
                                value={formData.employeeId}
                                onChange={handleChange}
                                size="small"
                            />
                        )}

                        <TextField
                            label="Hasło"
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            size="small"
                        />

                        {isRegisterMode && (
                            <TextField
                                label="Kod Menadżera (opcjonalny)"
                                name="secretCode"
                                type="password"
                                value={formData.secretCode}
                                onChange={handleChange}
                                size="small"
                                helperText="Wpisz 6969, aby uzyskać uprawnienia menadżera."
                            />
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            sx={{ mt: 1, backgroundColor: '#1a237e' }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : (isRegisterMode ? 'Zarejestruj się' : 'Zaloguj się')}
                        </Button>
                    </Box>
                )}

                {/* PRZYCISKI NAWIGACYJNE DO PRZEŁĄCZANIA WIDOKÓW */}
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {!isRecoveryMode && !isRegisterMode && (
                        <Link
                            component="button"
                            variant="body2"
                            onClick={toggleRecoveryMode}
                            sx={{ fontWeight: 'bold' }}
                        >
                            Nie pamiętasz ID pracownika?
                        </Link>
                    )}

                    <Typography variant="body2">
                        {isRecoveryMode ? (
                            <Link component="button" variant="body2" onClick={toggleRecoveryMode} sx={{ fontWeight: 'bold' }}>
                                Powrót do logowania
                            </Link>
                        ) : (
                            <>
                                {isRegisterMode ? 'Masz już konto?' : 'Nie masz konta?'}
                                <Link
                                    component="button"
                                    variant="body2"
                                    onClick={toggleMode}
                                    sx={{ ml: 1, fontWeight: 'bold' }}
                                >
                                    {isRegisterMode ? 'Zaloguj się' : 'Zarejestruj się'}
                                </Link>
                            </>
                        )}
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default Login;