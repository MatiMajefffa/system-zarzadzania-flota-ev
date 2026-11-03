import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
      !!localStorage.getItem('jwtToken')
  );

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('employeeId');
    setIsLoggedIn(false);
  };

  return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {!isLoggedIn ? (
            <Login onLoginSuccess={() => setIsLoggedIn(true)} />
        ) : (
            <Dashboard onLogout={handleLogout} />
        )}
      </ThemeProvider>
  );
}

export default App;