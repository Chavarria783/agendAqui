import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Calendar, LayoutList, GanttChart, Eye, CheckCircle, XCircle, LogIn } from 'lucide-react';
import {
  GET_RESERVAS,
  CONFIRMAR_RESERVA,
  CANCELAR_RESERVA
} from '../graphql/reservas';
import { GET_EVENTOS_CALENDARIO } from '../graphql/calendario';
import Loading from '../components/shared/Loading';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import ReservaModal from '../components/reservas/ReservaModal';
import ReservaDetalleModal from '../components/reservas/ReservaDetalleModal';
import CalendarioGrid from '../components/reservas/CalendarioGrid';
import CalendarioTimeline from '../components/reservas/CalendarioTimeline';
import AlertasReservas from '../components/reservas/AlertasReservas';
import ConfirmModal from '../components/shared/ConfirmModal';
import InputModal from '../components/shared/InputModal';
import SuccessModal from '../components/shared/SuccessModal';
import './Reservas.css';

function Reservas() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectionData, setSelectionData] = useState([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [vistaActual, setVistaActual] = useState('timeline'); // 'calendario', 'timeline' o 'lista'
  const [filtroAlerta, setFiltroAlerta] = useState(null);
  const [filters, setFilters] = useState({
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Estado para los filtros aplicados (solo cambia al hacer clic en "Buscar")
  const [appliedFilters, setAppliedFilters] = useState({
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Estados para modales de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState({ type: 'success', title: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_RESERVAS, {
    variables: {
      estado: appliedFilters.estado || undefined,
      fechaDesde: appliedFilters.fechaDesde || undefined,
      fechaHasta: appliedFilters.fechaHasta || undefined
    },
    pollInterval: isProcessing ? 0 : 30000, // Detener polling durante operaciones, 30s en reposo
    fetchPolicy: 'network-only' // Siempre obtener datos frescos
  });

  // Query para eventos del calendario (reservas + hospedajes walk-in)
  const { data: eventosData, refetch: refetchEventos } = useQuery(GET_EVENTOS_CALENDARIO, {
    variables: {
      fechaDesde: appliedFilters.fechaDesde || undefined,
      fechaHasta: appliedFilters.fechaHasta || undefined
    },
    pollInterval: isProcessing ? 0 : 30000,
    fetchPolicy: 'network-only'
  });

  const [confirmarReserva] = useMutation(CONFIRMAR_RESERVA);
  const [cancelarReserva] = useMutation(CANCELAR_RESERVA);

  if (loading) return <Loading fullScreen />;
  if (error) return <div className="error-message">Error al cargar reservas: {error.message}</div>;

  const reservas = data?.reservas || [];
  const eventosCalendario = eventosData?.eventosCalendario || [];

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters({ estado: '', fechaDesde: '', fechaHasta: '' });
    setAppliedFilters({ estado: '', fechaDesde: '', fechaHasta: '' });
  };

  const handleConfirmarReserva = (reservaId) => {
    // Encontrar la reserva para obtener su código
    const reserva = reservas.find(r => r.id === reservaId);
    const codigoReserva = reserva?.codigo || reservaId;

    // Guardar la acción de confirmación
    setConfirmAction({
      type: 'confirmar',
      reservaId,
      codigoReserva,
      title: 'Confirmar Reserva',
      message: `¿Estás seguro de confirmar la reserva ${codigoReserva}?`,
      variant: 'success'
    });

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const ejecutarConfirmacion = async () => {
    if (!confirmAction) return;

    setIsProcessing(true);

    try {
      // Ejecutar mutation CONFIRMAR_RESERVA
      await confirmarReserva({
        variables: { id: parseInt(confirmAction.reservaId, 10) }
      });

      // Cerrar modal de confirmación
      setShowConfirmModal(false);

      // Refrescar datos - forzar actualización
      const { data: nuevosDatos } = await refetch();
      await refetchEventos();

      // Log para debugging
      console.log('✅ Reserva confirmada - Refetch completado:', nuevosDatos);

      // Mostrar mensaje de éxito
      setSuccessMessage({
        type: 'success',
        title: 'Reserva Confirmada',
        message: `La reserva ${confirmAction.codigoReserva} ha sido confirmada exitosamente`
      });
      setShowSuccessModal(true);

    } catch (error) {
      // Cerrar modal de confirmación
      setShowConfirmModal(false);

      // Manejar errores apropiadamente
      console.error('Error al confirmar reserva:', error);
      setSuccessMessage({
        type: 'error',
        title: 'Error al Confirmar',
        message: error.message || 'No se pudo confirmar la reserva'
      });
      setShowSuccessModal(true);
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleCancelarReserva = (reservaId) => {
    // Encontrar la reserva para obtener su código
    const reserva = reservas.find(r => r.id === reservaId);
    const codigoReserva = reserva?.codigo || reservaId;

    // Guardar datos para la cancelación
    setConfirmAction({
      type: 'cancelar',
      reservaId,
      codigoReserva
    });

    // Mostrar modal para pedir motivo
    setShowInputModal(true);
  };

  const handleMotivoIngresado = (motivo) => {
    // Cerrar modal de input
    setShowInputModal(false);

    // Actualizar confirmAction con el motivo
    setConfirmAction(prev => ({
      ...prev,
      motivo,
      title: 'Cancelar Reserva',
      message: `¿Estás seguro de cancelar la reserva ${prev.codigoReserva}?`,
      variant: 'danger'
    }));

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const ejecutarCancelacion = async () => {
    if (!confirmAction || confirmAction.type !== 'cancelar') return;

    setIsProcessing(true);

    try {
      // Ejecutar mutation CANCELAR_RESERVA
      await cancelarReserva({
        variables: {
          id: parseInt(confirmAction.reservaId, 10),
          motivo: confirmAction.motivo || undefined
        }
      });

      // Cerrar modal de confirmación
      setShowConfirmModal(false);

      // Refrescar datos - forzar actualización
      const { data: nuevosDatos } = await refetch();
      await refetchEventos();

      // Log para debugging
      console.log('❌ Reserva cancelada - Refetch completado:', nuevosDatos);

      // Mostrar mensaje de éxito
      setSuccessMessage({
        type: 'success',
        title: 'Reserva Cancelada',
        message: `La reserva ${confirmAction.codigoReserva} ha sido cancelada exitosamente`
      });
      setShowSuccessModal(true);

    } catch (error) {
      // Cerrar modal de confirmación
      setShowConfirmModal(false);

      // Manejar errores apropiadamente
      console.error('Error al cancelar reserva:', error);
      setSuccessMessage({
        type: 'error',
        title: 'Error al Cancelar',
        message: error.message || 'No se pudo cancelar la reserva'
      });
      setShowSuccessModal(true);
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleConfirmarAccion = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'confirmar') {
      ejecutarConfirmacion();
    } else if (confirmAction.type === 'cancelar') {
      ejecutarCancelacion();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getEstadoBadgeVariant = (estado) => {
    const variants = {
      pendiente: 'warning',
      confirmada: 'success',
      cancelada: 'danger',
      en_curso: 'info',
      finalizada: 'secondary',
      no_show: 'danger'
    };
    return variants[estado] || 'default';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
      en_curso: 'En Curso',
      finalizada: 'Finalizada',
      no_show: 'No Show'
    };
    return labels[estado] || estado;
  };

  const handleSelectionComplete = (data) => {
    setSelectionData(data);
    setShowModal(true);
  };

  const handleVerDetalles = (reserva) => {
    setReservaSeleccionada(reserva);
    setShowDetalleModal(true);
  };

  const handleCerrarDetalleModal = () => {
    setShowDetalleModal(false);
    setReservaSeleccionada(null);
  };

  const handleConfirmarDesdeDetalle = (reserva) => {
    handleCerrarDetalleModal();
    handleConfirmarReserva(reserva.id);
  };

  const handleCancelarDesdeDetalle = (reserva) => {
    handleCerrarDetalleModal();
    handleCancelarReserva(reserva.id);
  };

  return (
    <div className="reservas-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reservas</h1>
            <p className="page-subtitle">Gestiona las reservaciones del hotel</p>
          </div>
          <div className="vista-toggle-group" role="group" aria-label="Cambiar vista">
            <button
              className={`vista-toggle-btn${vistaActual === 'timeline' ? ' vista-toggle-btn--active' : ''}`}
              onClick={() => setVistaActual('timeline')}
              aria-pressed={vistaActual === 'timeline'}
            >
              <GanttChart size={15} aria-hidden="true" />
              Timeline
            </button>
            <button
              className={`vista-toggle-btn${vistaActual === 'calendario' ? ' vista-toggle-btn--active' : ''}`}
              onClick={() => setVistaActual('calendario')}
              aria-pressed={vistaActual === 'calendario'}
            >
              <Calendar size={15} aria-hidden="true" />
              Calendario
            </button>
            <button
              className={`vista-toggle-btn${vistaActual === 'lista' ? ' vista-toggle-btn--active' : ''}`}
              onClick={() => setVistaActual('lista')}
              aria-pressed={vistaActual === 'lista'}
            >
              <LayoutList size={15} aria-hidden="true" />
              Lista
            </button>
          </div>
        </div>

        {/* ===== Vista Timeline ===== */}
        {vistaActual === 'timeline' && (
          <>
            <CalendarioTimeline
              onSelectionComplete={handleSelectionComplete}
              eventos={eventosCalendario}
              onReservaClick={handleVerDetalles}
              onHospedajeClick={(evento) => navigate(`/hospedajes?id=${evento.id}`)}
              fechaFiltroDesde={appliedFilters.fechaDesde}
              fechaFiltroHasta={appliedFilters.fechaHasta}
              refetchEventos={refetchEventos}
              onNuevaReserva={() => {
                setSelectionData([]);
                setShowModal(true);
              }}
            />
          </>
        )}

        {/* ===== Vista Calendario Grid ===== */}
        {vistaActual === 'calendario' && (
          <>
            <CalendarioGrid
              onSelectionComplete={handleSelectionComplete}
              eventos={eventosCalendario}
              onReservaClick={handleVerDetalles}
              onHospedajeClick={(evento) => navigate(`/hospedajes?id=${evento.id}`)}
              fechaFiltroDesde={appliedFilters.fechaDesde}
              fechaFiltroHasta={appliedFilters.fechaHasta}
            />
          </>
        )}

        {/* ===== Vista Lista ===== */}
        {vistaActual === 'lista' && (
          <>
            {/* Panel de Alertas del Día - solo en vista Lista */}
            <AlertasReservas
              onFilterClick={(filtro) => setFiltroAlerta(filtro)}
              filtroActivo={filtroAlerta}
            />

            <div className="filters-section">
              <div className="input-group">
                <label htmlFor="estado" className="input-label">Estado</label>
                <select
                  id="estado"
                  name="estado"
                  value={filters.estado}
                  onChange={handleFilterChange}
                  className="date-input"
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="en_curso">En Curso</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="fechaDesde" className="input-label">Desde</label>
                <input
                  type="date"
                  id="fechaDesde"
                  name="fechaDesde"
                  value={filters.fechaDesde}
                  onChange={handleFilterChange}
                  className="date-input"
                />
              </div>

              <div className="input-group">
                <label htmlFor="fechaHasta" className="input-label">Hasta</label>
                <input
                  type="date"
                  id="fechaHasta"
                  name="fechaHasta"
                  value={filters.fechaHasta}
                  onChange={handleFilterChange}
                  className="date-input"
                />
              </div>

              <div className="input-group">
                <label className="input-label">&nbsp;</label>
                <div className="filter-actions">
                  <Button
                    variant="primary"
                    onClick={handleApplyFilters}
                  >
                    Buscar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleClearFilters}
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </div>

            <div className="reservas-stats">
              <span className="stats-text">
                Mostrando {reservas.length} {reservas.length === 1 ? 'reserva' : 'reservas'}
              </span>
            </div>

            {reservas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No se encontraron reservas</h3>
                <p>
                  {!filters.estado && !filters.fechaDesde && !filters.fechaHasta
                    ? 'Comienza creando tu primera reserva.'
                    : 'Intenta ajustar los filtros para ver más resultados.'}
                </p>
                {!filters.estado && !filters.fechaDesde && !filters.fechaHasta && (
                  <Button variant="primary" onClick={() => {
                    setSelectionData([]);
                    setShowModal(true);
                  }}>
                    Crear Primera Reserva
                  </Button>
                )}
              </div>
            ) : (
              <div className="reservas-tabla-container">
                <table className="reservas-tabla">
                  <thead>
                    <tr>
                      <th className="col-center col-alertas">Alerta</th>
                      <th>Código</th>
                      <th>Huésped</th>
                      <th>Habitación</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th className="col-center col-noches">Noches</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th className="col-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map((reserva) => {
                      const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                      const entradaStr = reserva.fecha_entrada?.split('T')[0];
                      const salidaStr = reserva.fecha_salida?.split('T')[0];
                      const esLlegadaHoy = entradaStr === hoyStr && reserva.estado === 'confirmada';
                      const esSalidaHoy = salidaStr === hoyStr && reserva.estado === 'en_curso';
                      const esLateCheckout = salidaStr < hoyStr && reserva.estado === 'en_curso';
                      const esPendiente = reserva.estado === 'pendiente';

                      let rowClass = 'reservas-tabla__row';
                      if (esLateCheckout) rowClass += ' reservas-tabla__row--late';
                      else if (esLlegadaHoy) rowClass += ' reservas-tabla__row--llegada';
                      else if (esSalidaHoy) rowClass += ' reservas-tabla__row--salida';
                      else if (esPendiente) rowClass += ' reservas-tabla__row--pendiente';

                      return (
                        <tr key={reserva.id} className={rowClass}>
                          <td className="col-center col-alertas">
                            {esLateCheckout && (
                              <span className="alerta-badge alerta-badge--late" title={`Check-out vencido desde ${formatDate(reserva.fecha_salida)}`}>
                                <span className="alerta-badge__dot alerta-badge__dot--pulse" />
                              </span>
                            )}
                            {esLlegadaHoy && (
                              <span className="alerta-badge alerta-badge--llegada" title="Llegada hoy">
                                HOY
                              </span>
                            )}
                            {esSalidaHoy && (
                              <span className="alerta-badge alerta-badge--salida" title="Salida hoy">
                                HOY
                              </span>
                            )}
                            {esPendiente && !esLlegadaHoy && (
                              <span className="alerta-badge alerta-badge--pendiente" title="Pendiente de confirmación">
                                <span className="alerta-badge__dot" />
                              </span>
                            )}
                          </td>
                          <td className="td-codigo">{reserva.codigo}</td>
                          <td>{reserva.huesped?.nombre_completo || '—'}</td>
                          <td>{reserva.habitacion?.numero} - {reserva.habitacion?.tipo}</td>
                          <td>{formatDate(reserva.fecha_entrada)}</td>
                          <td>{formatDate(reserva.fecha_salida)}</td>
                          <td className="col-center col-noches">{reserva.noches}</td>
                          <td className="td-total">{formatPrice(reserva.precio_total)}</td>
                          <td>
                            <Badge variant={getEstadoBadgeVariant(reserva.estado)}>
                              {getEstadoLabel(reserva.estado)}
                            </Badge>
                          </td>
                          <td>
                            <div className="tabla-acciones">
                              <button
                                className="tabla-btn tabla-btn--info"
                                title="Ver Detalles"
                                onClick={() => handleVerDetalles(reserva)}
                              >
                                <Eye size={16} />
                              </button>
                              {reserva.estado === 'pendiente' && (
                                <>
                                  <button
                                    className="tabla-btn tabla-btn--success"
                                    title="Confirmar Reserva"
                                    onClick={() => handleConfirmarReserva(reserva.id)}
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    className="tabla-btn tabla-btn--danger"
                                    title="Cancelar Reserva"
                                    onClick={() => handleCancelarReserva(reserva.id)}
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                              {reserva.estado === 'confirmada' && (
                                <>
                                  <button
                                    className="tabla-btn tabla-btn--primary"
                                    title="Check-In"
                                    onClick={() => navigate(`/hospedajes/checkin?reserva=${reserva.id}`)}
                                  >
                                    <LogIn size={16} />
                                  </button>
                                  <button
                                    className="tabla-btn tabla-btn--danger"
                                    title="Cancelar Reserva"
                                    onClick={() => handleCancelarReserva(reserva.id)}
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Modal de Nueva Reserva */}
        <ReservaModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectionData([]);
          }}
          selectionData={selectionData}
          onSuccess={async () => {
            await Promise.all([refetch(), refetchEventos()]);
            setShowModal(false);
            setSelectionData([]);
          }}
        />

        {/* Modal de Detalles de Reserva */}
        <ReservaDetalleModal
          isOpen={showDetalleModal}
          onClose={handleCerrarDetalleModal}
          reserva={reservaSeleccionada}
          onConfirmar={handleConfirmarDesdeDetalle}
          onCancelar={handleCancelarDesdeDetalle}
        />

        {/* Modal de Confirmación */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
          onConfirm={handleConfirmarAccion}
          title={confirmAction?.title}
          message={confirmAction?.message}
          variant={confirmAction?.variant || 'warning'}
          loading={isProcessing}
        />

        {/* Modal para Motivo de Cancelación */}
        <InputModal
          isOpen={showInputModal}
          onClose={() => {
            setShowInputModal(false);
            setConfirmAction(null);
          }}
          onConfirm={handleMotivoIngresado}
          title="Motivo de Cancelación"
          message="Por favor, ingrese el motivo de la cancelación de la reserva:"
          placeholder="Ej: Cliente canceló, error en la reserva, etc."
          required={false}
        />

        {/* Modal de Éxito/Error */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title={successMessage.title}
          message={successMessage.message}
          type={successMessage.type}
        />
      </div>
  );
}

export default Reservas;
