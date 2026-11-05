import React from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import './App.css';

export default function App() {
  const path = window.location.pathname;
  const token = localStorage.getItem('token');

  // Jeśli użytkownik nie ma tokena lub weszedł na /login, pokazujemy logowanie
  if (path === '/login' || !token || token === 'undefined' || token === 'null') {
    return <Login />;
  }

  // W przeciwnym razie ładujemy główny panel
  return <Dashboard />;
}