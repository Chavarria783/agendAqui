import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { CHECK_IN } from '../graphql/hospedajes';
import { GET_RESERVA } from '../graphql/reservas';
import { GET_HABITACIONES } from '../graphql/habitaciones';
import BuscadorClienteHuesped from '../components/hospedajes/BuscadorClienteHuesped';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import Select from '../components/shared/Select';
import SuccessModal from '../components/shared/SuccessModal';
import { Search, UserPlus, Home, Calendar, Users, Plus, X } from 'lucide-react';
import './CheckIn.css';

function CheckIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservaIdParam = searchParams.get('reserva');

  const [modo, setModo] = useState(reservaIdParam ? 'reserva' : 'walkin'); // 'reserva' o 'walkin'
  const [busquedaReserva, setBusquedaReserva] = useState('');
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [acompanantes, setAcompanantes] = useState([]);

  const [formData, setFormData] = useState({
    habitacion_id: '',
    huesped_id: null,
    cliente_id: null,
    reserva_id: null,
    fecha_entrada: new Date().toISOString().slice(0, 10),
    fecha_salida: '',
    num_adultos: 1,
    num_ninos: 0,
    observaciones: ''
  });

  const [huespedConfirmado, setHuespedConfirmado] = useState(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  // Queries
  const { data: habitacionesData } = useQuery(GET_HABITACIONES, {
    variables: { estado: 'disponible' }
  });

  const [buscarReserva, { data: reservaData, loading: buscandoReserva }] = useLazyQuery(GET_RESERVA);

  // Mutations
  const [checkIn, { loading: procesandoCheckIn }] = useMutation(CHECK_IN, {
    onCompleted: (data) => {
      setSuccessModal({ isOpen: true, message: `Check-In realizado exitosamente. Hospedaje: ${data.checkIn.codigo}` });
    },
    onError: (error) => {
      setErrorModal({ isOpen: true, message: `Error al realizar check-in: ${error.message}` });
    }
  });

  const habitaciones = habitacionesData?.habitaciones || [];

  // Si viene con reservaId en URL, buscarla automáticamente
  useEffect(() => {
    if (reservaIdParam) {
      buscarReserva({ variables: { id: parseInt(reservaIdParam) } });
    }
  }, [reservaIdParam]);

  // Cuando se encuentra una reserva, pre-llenar el formulario
  useEffect(() => {
    if (reservaData?.reserva) {
      const reserva = reservaData.reserva;
      setReservaSeleccionada(reserva);
      setFormData(prev => ({
        ...prev,
        habitacion_id: reserva.habitacion_id.toString(),
        reserva_id: reserva.id,
        fecha_entrada: reserva.fecha_entrada.split('T')[0],
        fecha_salida: reserva.fecha_salida.split('T')[0],
        num_adultos: reserva.num_adultos || 1,
        num_ninos: reserva.num_ninos || 0,
        huesped_id: reserva.huesped_id
      }));
      setHuespedConfirmado({
        id: reserva.huesped_id,
        cliente_id: reserva.cliente_id
      });
    }
  }, [reservaData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleBuscarReserva = () => {
    if (!busquedaReserva) {
      setErrorModal({ isOpen: true, message: 'Ingresa el ID de la reserva' });
      return;
    }
    buscarReserva({ variables: { id: parseInt(busquedaReserva) } });
  };

  const handleClienteSeleccionado = (cliente) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id
    }));
  };

  const handleHuespedConfirmado = (huesped) => {
    setHuespedConfirmado(huesped);
    setFormData(prev => ({
      ...prev,
      huesped_id: huesped.id,
      cliente_id: huesped.cliente_id
    }));
  };

  const agregarAcompanante = () => {
    setAcompanantes([...acompanantes, { nombre: '', edad: '', parentesco: '' }]);
  };

  const eliminarAcompanante = (index) => {
    setAcompanantes(acompanantes.filter((_, i) => i !== index));
  };

  const actualizarAcompanante = (index, campo, valor) => {
    const nuevosAcompanantes = [...acompanantes];
    nuevosAcompanantes[index] = {
      ...nuevosAcompanantes[index],
      [campo]: valor
    };
    setAcompanantes(nuevosAcompanantes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.habitacion_id) {
      setErrorModal({ isOpen: true, message: 'Selecciona una habitación' });
      return;
    }

    if (!formData.fecha_entrada || !formData.fecha_salida) {
      setErrorModal({ isOpen: true, message: 'Completa las fechas de entrada y salida' });
      return;
    }

    if (!formData.huesped_id) {
      setErrorModal({ isOpen: true, message: 'Debes confirmar los datos del cliente y huésped' });
      return;
    }

    // Preparar acompañantes
    const acompanantesData = acompanantes
      .filter(a => a.nombre && a.nombre.trim())
      .map(a => ({
        nombre: a.nombre,
        edad: a.edad ? parseInt(a.edad) : null,
        parentesco: a.parentesco || null
      }));

    // Realizar check-in
    try {
      await checkIn({
        variables: {
          input: {
            habitacion_id: parseInt(formData.habitacion_id),
            huesped_id: parseInt(formData.huesped_id),
            reserva_id: formData.reserva_id ? parseInt(formData.reserva_id) : null,
            fecha_entrada: formData.fecha_entrada,
            fecha_salida_prevista: formData.fecha_salida,
            num_adultos: parseInt(formData.num_adultos),
            num_ninos: parseInt(formData.num_ninos),
            acompanantes: acompanantesData.length > 0 ? acompanantesData : null,
            observaciones: formData.observaciones || null
          }
        }
      });
    } catch (error) {
      console.error('Error en check-in:', error);
    }
  };

  return (
    <div className="checkin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Check-In</h1>
          <p className="page-subtitle">Registrar entrada de huéspedes</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/hospedajes')}>
          Volver a Reservas
        </Button>
      </div>

      {/* Selector de Modo */}
      <div className="modo-selector">
        <Button
          variant={modo === 'reserva' ? 'primary' : 'outline'}
          onClick={() => setModo('reserva')}
          icon={<Calendar size={18} />}
        >
          Desde Reserva
        </Button>
        <Button
          variant={modo === 'walkin' ? 'primary' : 'outline'}
          onClick={() => setModo('walkin')}
          icon={<UserPlus size={18} />}
        >
          Walk-In (Sin Reserva)
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="checkin-form">
        {/* Búsqueda de Reserva */}
        {modo === 'reserva' && !reservaSeleccionada && (
          <div className="checkin-seccion">
            <h3>Buscar Reserva</h3>
            <div className="busqueda-group">
              <Input
                type="number"
                value={busquedaReserva}
                onChange={(e) => setBusquedaReserva(e.target.value)}
                placeholder="ID de Reserva"
              />
              <Button
                type="button"
                onClick={handleBuscarReserva}
                disabled={buscandoReserva}
                icon={<Search size={18} />}
              >
                {buscandoReserva ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>
        )}

        {/* Información de Reserva (si existe) */}
        {reservaSeleccionada && (
          <div className="reserva-info">
            <h4>Reserva: {reservaSeleccionada.codigo}</h4>
            <div className="info-grid">
              <div>
                <span className="label">Huésped:</span>
                <span className="valor">{reservaSeleccionada.huesped?.nombre_completo}</span>
              </div>
              <div>
                <span className="label">Habitación:</span>
                <span className="valor">
                  {reservaSeleccionada.habitacion?.numero} - {reservaSeleccionada.habitacion?.tipo}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selección de Habitación (Walk-in) */}
        {modo === 'walkin' && (
          <div className="checkin-seccion">
            <h3><Home size={20} /> Habitación</h3>
            <Select
              label="Habitación Disponible *"
              name="habitacion_id"
              value={formData.habitacion_id}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Seleccionar habitación...' },
                ...habitaciones.map(hab => ({
                  value: hab.id.toString(),
                  label: `${hab.numero} - ${hab.tipo} ($${hab.precio_noche.toLocaleString('es-CO')}/noche)`
                }))
              ]}
              required
            />
          </div>
        )}

        {/* Búsqueda/Creación de Cliente y Huésped (Walk-in) */}
        {modo === 'walkin' && (
          <div className="checkin-seccion">
            <BuscadorClienteHuesped
              onClienteSeleccionado={handleClienteSeleccionado}
              onHuespedConfirmado={handleHuespedConfirmado}
              disabled={procesandoCheckIn}
            />
          </div>
        )}

        {/* Fechas */}
        <div className="checkin-seccion">
          <h3><Calendar size={20} /> Fechas de Hospedaje</h3>
          <div className="form-row">
            <Input
              type="date"
              label="Fecha Entrada *"
              name="fecha_entrada"
              value={formData.fecha_entrada}
              onChange={handleInputChange}
              required
              disabled={modo === 'reserva'}
            />
            <Input
              type="date"
              label="Fecha Salida *"
              name="fecha_salida"
              value={formData.fecha_salida}
              onChange={handleInputChange}
              required
              disabled={modo === 'reserva'}
            />
          </div>
          <div className="form-row">
            <Input
              type="number"
              label="Adultos"
              name="num_adultos"
              value={formData.num_adultos}
              onChange={handleInputChange}
              min="1"
            />
            <Input
              type="number"
              label="Niños"
              name="num_ninos"
              value={formData.num_ninos}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        {/* Acompañantes */}
        <div className="checkin-seccion">
          <div className="seccion-header">
            <h3><Users size={20} /> Acompañantes (Opcional)</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarAcompanante}
              icon={<Plus size={16} />}
            >
              Agregar
            </Button>
          </div>

          {acompanantes.length === 0 ? (
            <p className="texto-vacio">No hay acompañantes agregados</p>
          ) : (
            <div className="acompanantes-lista">
              {acompanantes.map((acomp, index) => (
                <div key={index} className="acompanante-item">
                  <span className="acompanante-numero">#{index + 1}</span>
                  <Input
                    placeholder="Nombre completo"
                    value={acomp.nombre}
                    onChange={(e) => actualizarAcompanante(index, 'nombre', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Edad"
                    value={acomp.edad}
                    onChange={(e) => actualizarAcompanante(index, 'edad', e.target.value)}
                    style={{ width: '100px' }}
                  />
                  <Input
                    placeholder="Parentesco"
                    value={acomp.parentesco}
                    onChange={(e) => actualizarAcompanante(index, 'parentesco', e.target.value)}
                    style={{ width: '150px' }}
                  />
                  <button
                    type="button"
                    className="btn-eliminar"
                    onClick={() => eliminarAcompanante(index)}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="checkin-seccion">
          <label htmlFor="observaciones">Observaciones</label>
          <textarea
            id="observaciones"
            name="observaciones"
            value={formData.observaciones}
            onChange={handleInputChange}
            rows={3}
            className="textarea-observaciones"
            placeholder="Notas adicionales sobre el check-in..."
          />
        </div>

        {/* Acciones */}
        <div className="checkin-acciones">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/hospedajes')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={procesandoCheckIn}
            loading={procesandoCheckIn}
          >
            {procesandoCheckIn ? 'Procesando...' : 'Realizar Check-In'}
          </Button>
        </div>
      </form>

      {/* Modales de éxito y error */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => {
          const esCheckInExitoso = successModal.message.includes('Check-In realizado');
          setSuccessModal({ isOpen: false, message: '' });
          // Solo navegar si fue un check-in exitoso, no para "Huésped encontrado"
          if (esCheckInExitoso) {
            navigate('/hospedajes');
          }
        }}
        type="success"
        message={successModal.message}
      />

      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
      />
    </div>
  );
}

export default CheckIn;
