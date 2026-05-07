import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'react-hot-toast';
import apolloClient from './apolloClient';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Habitaciones from './pages/Habitaciones';
import Reservas from './pages/Reservas';
import Hospedajes from './pages/Hospedajes';
import CheckIn from './pages/CheckIn';
import Huespedes from './pages/Huespedes';
import ClientesPage from './pages/ClientesPage';
import Configuracion from './pages/Configuracion';
import POS from './pages/POS';
import CajaPage from './pages/CajaPage';
import Facturacion from './pages/Facturacion';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Login público */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas con Layout */}
        <Route path="/*" element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="habitaciones" element={<Habitaciones />} />
            {/* TODO Sprint 2: Descomentar cuando se presenten estos modulos */}
            {/* <Route path="reservas" element={<Reservas />} /> */}
            {/* <Route path="hospedajes" element={<Hospedajes />} /> */}
            {/* <Route path="hospedajes/checkin" element={<CheckIn />} /> */}
            {/* <Route path="huespedes" element={<Huespedes />} /> */}
            {/* <Route path="clientes" element={<ClientesPage />} /> */}
            {/* <Route path="pos" element={<POS />} /> */}
            {/* <Route path="caja" element={<CajaPage />} /> */}
            {/* <Route path="facturacion" element={<Facturacion />} /> */}
            {/* <Route
              path="configuracion"
              element={
                <PrivateRoute allowedRoles={['admin', 'superadmin']}>
                  <Configuracion />
                </PrivateRoute>
              }
            /> */}
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ApolloProvider client={apolloClient}>
        <NotificationProvider>
          <ThemedToaster />
          <AppContent />
        </NotificationProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}

// Componente Toaster que responde al tema
function ThemedToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--hotel-card-background)',
          color: 'var(--hotel-text)',
          border: '1px solid var(--hotel-border)',
        },
        success: {
          style: {
            background: '#10b981',
            color: '#ffffff',
          },
        },
        error: {
          style: {
            background: '#ef4444',
            color: '#ffffff',
          },
        },
      }}
    />
  );
}

// Componente para rutas protegidas por autenticacion
function ProtectedRoute() {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default App;
