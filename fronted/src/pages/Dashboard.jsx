import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_ESTADISTICAS_HABITACIONES } from '../graphql/habitaciones';
import Loading from '../components/shared/Loading';
import {
  Building2,
  CheckCircle,
  XCircle,
  Sparkles,
  Wrench,
  Calendar,
  BedDouble,
  CalendarCheck,
  LogIn,
  Users
} from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(GET_ESTADISTICAS_HABITACIONES, {
    pollInterval: 30000 // Actualizar cada 30 segundos
  });

  if (loading) return <Loading fullScreen />;
  if (error) return (
    <div className="error-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Error al cargar estadísticas: {error.message}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
        Reintentar
      </button>
    </div>
  );

  const stats = data?.estadisticasHabitaciones || {
    total: 0,
    disponibles: 0,
    ocupadas: 0,
    limpieza: 0,
    mantenimiento: 0,
    reservadas: 0,
    porcentaje_ocupacion: 0
  };

  return (
    <div className="dashboard-container">
        <div className="dashboard-header-section">
          <h1 className="dashboard-title">Panel de Control</h1>
          <p className="dashboard-subtitle">Resumen general del hotel</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">
              <Building2 size={28} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <h3 className="stat-label">TOTAL HABITACIONES</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">
              <CheckCircle size={28} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <h3 className="stat-label">DISPONIBLES</h3>
              <p className="stat-value">{stats.disponibles}</p>
            </div>
          </div>

          <div className="stat-card stat-danger">
            <div className="stat-icon">
              <XCircle size={28} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <h3 className="stat-label">OCUPADAS</h3>
              <p className="stat-value">{stats.ocupadas}</p>
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon">
              <Sparkles size={28} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <h3 className="stat-label">EN LIMPIEZA</h3>
              <p className="stat-value">{stats.limpieza}</p>
            </div>
          </div>

          <div className="stat-card stat-secondary">
            <div className="stat-icon">
              <Wrench size={28} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <h3 className="stat-label">MANTENIMIENTO</h3>
              <p className="stat-value">{stats.mantenimiento}</p>
            </div>
          </div>

          <div className="stat-card stat-info">
            <div className="stat-icon">
              <Calendar size={28} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <h3 className="stat-label">RESERVADAS</h3>
              <p className="stat-value">{stats.reservadas}</p>
            </div>
          </div>
        </div>

        <div className="occupancy-section">
          <h2 className="section-title">Ocupación Actual</h2>
          <div className="occupancy-card">
            <div className="occupancy-bar-container">
              <div
                className="occupancy-bar"
                style={{ width: `${stats.porcentaje_ocupacion}%` }}
              />
            </div>
            <div className="occupancy-stats">
              <span className="occupancy-percentage">{Math.round(stats.porcentaje_ocupacion)}%</span>
              <span className="occupancy-text">
                {stats.ocupadas} de {stats.total} habitaciones ocupadas
              </span>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2 className="section-title">Acciones Rápidas</h2>
          <div className="actions-grid">
            <button
              className="action-card"
              onClick={() => navigate('/habitaciones')}
            >
              <div className="action-icon">
                <BedDouble size={36} strokeWidth={2} />
              </div>
              <h3>Habitaciones</h3>
              <p>Gestionar habitaciones</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate('/reservas')}
            >
              <div className="action-icon">
                <CalendarCheck size={36} strokeWidth={2} />
              </div>
              <h3>Nueva Reserva</h3>
              <p>Crear reservación</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate('/hospedajes/checkin')}
            >
              <div className="action-icon">
                <LogIn size={36} strokeWidth={2} />
              </div>
              <h3>Check-In</h3>
              <p>Registrar ingreso</p>
            </button>
            {/* <button
              className="action-card"
              onClick={() => navigate('/huespedes')}
            >
              <div className="action-icon">
                <Users size={36} strokeWidth={2} />
              </div>
              <h3>Huéspedes</h3>
              <p>Ver clientes</p>
            </button> */}
          </div>
        </div>
      </div>
  );
}

export default Dashboard;
