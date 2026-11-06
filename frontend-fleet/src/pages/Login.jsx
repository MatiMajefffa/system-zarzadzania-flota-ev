import React, { useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Alert, Link, CircularProgress
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const Login = () => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Stan formularza dla rejestracji i logowania
    const [formData, setFormData] = useState({
        employeeId: '', // Używane do logowania
        email: '',      // Używane do rejestracji
        password: '',
        firstname: '',
        lastname: '',
        secretCode: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setMessage({ text: '', type: '' });
        setFormData({ employeeId: '', email: '', password: '', firstname: '', lastname: '', secretCode: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

        // Payload dopasowany do backendu dla logowania (employeeId + password) i rejestracji
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    if (data.employeeId) {
                        localStorage.setItem('employeeId', data.employeeId);
                    }
                    window.location.href = '/'; // Przejście do Dashboardu
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

    return (
        <Box
            sx={{
                height: '100vh',
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
                    {isRegisterMode ? 'Utwórz nowe konto' : 'Zaloguj się do panelu'}
                </Typography>

                {message.text && (
                    <Alert severity={message.type} sx={{ mb: 2 }}>
                        {message.text}
                    </Alert>
                )}

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

                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2">
                        {isRegisterMode ? 'Masz już konto?' : 'Nie masz konta?'}
                        <Link
                            component="button"
                            variant="body2"
                            onClick={toggleMode}
                            sx={{ ml: 1, fontWeight: 'bold' }}
                        >
                            {isRegisterMode ? 'Zaloguj się' : 'Zarejestruj się'}
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default Login;