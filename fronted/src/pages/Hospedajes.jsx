import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_HOSPEDAJES } from '../graphql/hospedajes';
import { Search, Filter, LogOut, Plus, Eye, Receipt, ShoppingCart, Hotel } from 'lucide-react';
import CheckOutModal from '../components/hospedajes/CheckOutModal';
import HospedajeDetalleModal from '../components/hospedajes/HospedajeDetalleModal';
import ConfirmModal from '../components/shared/ConfirmModal';
import Button from '../components/shared/Button';
import Loading from '../components/shared/Loading';
import './Hospedajes.css';

function Hospedajes() {
  const navigate = useNavigate();

  const [filtros, setFiltros] = useState({
    estado: 'activo',
    busqueda: ''
  });

  const [hospedajeSeleccionado, setHospedajeSeleccionado] = useState(null);
  const [modalConfirmCheckOut, setModalConfirmCheckOut] = useState(false);
  const [modalCheckOutOpen, setModalCheckOutOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [hospedajeDetalleId, setHospedajeDetalleId] = useState(null);

  // Query para obtener hospedajes
  const { data, loading, error, refetch } = useQuery(GET_HOSPEDAJES, {
    variables: {
      estado: filtros.estado === 'todos' ? null : filtros.estado
    },
    fetchPolicy: 'cache-and-network'
  });

  const hospedajes = data?.hospedajes || [];

  // Filtrar por búsqueda local
  const hospedajesFiltrados = hospedajes.filter(h => {
    if (!filtros.busqueda) return true;

    const busqueda = filtros.busqueda.toLowerCase();
    return (
      h.codigo?.toLowerCase().includes(busqueda) ||
      h.huesped?.nombre_completo?.toLowerCase().includes(busqueda) ||
      h.habitacion?.numero?.toLowerCase().includes(busqueda)
    );
  });

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  const handleCheckOut = (hospedaje) => {
    setHospedajeSeleccionado(hospedaje);
    setModalConfirmCheckOut(true);
  };

  const handleConfirmCheckOut = () => {
    setModalConfirmCheckOut(false);
    setModalCheckOutOpen(true);
  };

  const handleCheckOutSuccess = () => {
    setModalCheckOutOpen(false);
    setHospedajeSeleccionado(null);
    refetch(); // Refrescar lista
  };

  const handleVerDetalle = (hospedajeId) => {
    setHospedajeDetalleId(hospedajeId);
    setModalDetalleOpen(true);
  };

  const handleGestionarConsumos = (hospedajeId) => {
    setHospedajeDetalleId(hospedajeId);
    setModalDetalleOpen(true);
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
    }).format(price || 0);
  };

  const calcularNoches = (fechaEntrada, fechaSalida) => {
    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    const diffTime = Math.abs(salida - entrada);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'activo':
        return 'badge-activo';
      case 'finalizado':
        return 'badge-finalizado';
      case 'cancelado':
        return 'badge-cancelado';
      default:
        return '';
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <div className="hospedajes-error">Error al cargar hospedajes: {error.message}</div>;

  return (
    <div className="hospedajes-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hospedajes</h1>
          <p className="page-subtitle">Gestión de hospedajes activos y finalizados</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => navigate('/hospedajes/checkin')}
        >
          Nuevo Check-In
        </Button>
      </div>

      {/* Filtros */}
      <div className="hospedajes-filtros">
        <div className="filtro-busqueda">
          <Search size={20} />
          <input
            type="text"
            name="busqueda"
            placeholder="Buscar por código, huésped o habitación..."
            value={filtros.busqueda}
            onChange={handleFiltroChange}
          />
        </div>

        <div className="filtro-estado">
          <Filter size={20} />
          <select
            name="estado"
            value={filtros.estado}
            onChange={handleFiltroChange}
          >
            <option value="activo">Activos</option>
            <option value="finalizado">Finalizados</option>
            <option value="cancelado">Cancelados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="hospedajes-contador">
        {hospedajesFiltrados.length} {hospedajesFiltrados.length === 1 ? 'hospedaje' : 'hospedajes'} encontrado{hospedajesFiltrados.length === 1 ? '' : 's'}
      </div>

      {/* Lista de Hospedajes */}
      {hospedajesFiltrados.length === 0 ? (
        <div className="hospedajes-empty">
          <Hotel size={48} />
          <p>No hay hospedajes que coincidan con los filtros</p>
          {filtros.estado === 'activo' && (
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => navigate('/hospedajes/checkin')}
            >
              Realizar Check-In
            </Button>
          )}
        </div>
      ) : (
        <div className="hospedajes-grid">
          {hospedajesFiltrados.map((hospedaje) => (
            <div key={hospedaje.id} className="hospedaje-card">
              {/* Header de la Card */}
              <div className="card-header">
                <div className="card-codigo">
                  <Receipt size={16} />
                  {hospedaje.codigo}
                </div>
                <div className="card-badges">
                  {hospedaje.tra_estado && (
                    <span
                      className={`badge-tra badge-tra-${hospedaje.tra_estado}`}
                      title={`TRA: ${hospedaje.tra_estado === 'no_configurado' ? 'No configurado' : hospedaje.tra_estado}`}
                    >
                      TRA
                    </span>
                  )}
                  <span className={`card-estado ${getEstadoBadgeClass(hospedaje.estado)}`}>
                    {hospedaje.estado}
                  </span>
                </div>
              </div>

              {/* Info de Habitación */}
              <div className="card-habitacion">
                <div className="habitacion-numero">
                  Habitación {hospedaje.habitacion?.numero}
                </div>
                <div className="habitacion-tipo">
                  {hospedaje.habitacion?.tipo}
                </div>
              </div>

              {/* Info de Huésped */}
              <div className="card-huesped">
                <div className="huesped-nombre">
                  {hospedaje.huesped?.nombre_completo}
                </div>
                <div className="huesped-documento">
                  {hospedaje.huesped?.tipo_documento} {hospedaje.huesped?.numero_documento}
                </div>
              </div>

              {/* Fechas */}
              <div className="card-fechas">
                <div className="fecha-item">
                  <span className="fecha-label">Entrada:</span>
                  <span className="fecha-valor">{formatDate(hospedaje.fecha_entrada)}</span>
                </div>
                <div className="fecha-item">
                  <span className="fecha-label">Salida:</span>
                  <span className="fecha-valor">
                    {hospedaje.fecha_salida_real
                      ? formatDate(hospedaje.fecha_salida_real)
                      : formatDate(hospedaje.fecha_salida_prevista)
                    }
                  </span>
                </div>
                <div className="fecha-noches">
                  {hospedaje.noches_reales || hospedaje.noches_previstas} {
                    (hospedaje.noches_reales || hospedaje.noches_previstas) === 1
                      ? 'noche'
                      : 'noches'
                  }
                </div>
              </div>

              {/* Precio */}
              <div className="card-precio">
                <span className="precio-label">Total:</span>
                <span className="precio-valor">{formatPrice(hospedaje.precio_total_hospedaje)}</span>
              </div>

              {/* Acompañantes */}
              {hospedaje.num_adultos > 0 || hospedaje.num_ninos > 0 ? (
                <div className="card-ocupantes">
                  {hospedaje.num_adultos > 0 && (
                    <span>{hospedaje.num_adultos} {hospedaje.num_adultos === 1 ? 'adulto' : 'adultos'}</span>
                  )}
                  {hospedaje.num_ninos > 0 && (
                    <span>{hospedaje.num_ninos} {hospedaje.num_ninos === 1 ? 'niño' : 'niños'}</span>
                  )}
                </div>
              ) : null}

              {/* Reserva asociada */}
              {hospedaje.reserva && (
                <div className="card-reserva">
                  Desde reserva: {hospedaje.reserva.codigo}
                </div>
              )}

              {/* Acciones */}
              <div className="card-acciones">
                <Button
                  variant="outline"
                  size="small"
                  icon={<Eye size={16} />}
                  onClick={() => handleVerDetalle(hospedaje.id)}
                >
                  Ver Detalle
                </Button>

                {hospedaje.estado === 'activo' && (
                  <>
                    <Button
                      variant="secondary"
                      size="small"
                      icon={<ShoppingCart size={16} />}
                      onClick={() => handleGestionarConsumos(hospedaje.id)}
                    >
                      Consumos
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      icon={<LogOut size={16} />}
                      onClick={() => handleCheckOut(hospedaje)}
                    >
                      Check-Out
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmación de Check-Out */}
      <ConfirmModal
        isOpen={modalConfirmCheckOut}
        onClose={() => {
          setModalConfirmCheckOut(false);
          setHospedajeSeleccionado(null);
        }}
        onConfirm={handleConfirmCheckOut}
        title="Confirmar Check-Out"
        message={hospedajeSeleccionado ? (
          <>
            ¿Deseas realizar el check-out del hospedaje <strong>{hospedajeSeleccionado.codigo}</strong>?
            <br /><br />
            <strong>Habitación:</strong> {hospedajeSeleccionado.habitacion?.numero} - {hospedajeSeleccionado.habitacion?.tipo}
            <br />
            <strong>Huésped:</strong> {hospedajeSeleccionado.huesped?.nombre_completo}
          </>
        ) : ''}
        variant="warning"
        confirmText="Continuar con Check-Out"
        cancelText="Cancelar"
      />

      {/* Modal de Check-Out */}
      <CheckOutModal
        isOpen={modalCheckOutOpen}
        onClose={() => {
          setModalCheckOutOpen(false);
          setHospedajeSeleccionado(null);
        }}
        hospedaje={hospedajeSeleccionado}
        onSuccess={handleCheckOutSuccess}
      />

      {/* Modal de Detalle de Hospedaje */}
      <HospedajeDetalleModal
        isOpen={modalDetalleOpen}
        onClose={() => {
          setModalDetalleOpen(false);
          setHospedajeDetalleId(null);
          refetch(); // Refrescar por si hubo cambios en consumos
        }}
        hospedajeId={hospedajeDetalleId}
        onCheckOut={(hospedaje) => {
          setModalDetalleOpen(false);
          setHospedajeDetalleId(null);
          handleCheckOut(hospedaje);
        }}
      />
    </div>
  );
}

export default Hospedajes;
