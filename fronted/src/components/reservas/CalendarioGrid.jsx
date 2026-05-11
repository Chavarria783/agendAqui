import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HABITACIONES } from '../../graphql/habitaciones';
import SuccessModal from '../shared/SuccessModal';
import './CalendarioGrid.css';

function CalendarioGrid({ onSelectionComplete, eventos = [], onReservaClick, onHospedajeClick, fechaFiltroDesde, fechaFiltroHasta }) {
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [diasVisible, setDiasVisible] = useState(14); // Mostrar 2 semanas por defecto
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccion, setSeleccion] = useState([]);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [habitacionFiltro, setHabitacionFiltro] = useState(''); // Filtro por habitación
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const gridRef = useRef(null);

  const { data: habitacionesData, loading } = useQuery(GET_HABITACIONES);
  const todasHabitaciones = habitacionesData?.habitaciones || [];

  // Filtrar habitaciones según el filtro seleccionado
  const habitaciones = habitacionFiltro
    ? todasHabitaciones.filter(h => h.id === habitacionFiltro)
    : todasHabitaciones;

  // Generar array de fechas
  const generarFechas = () => {
    const fechas = [];
    for (let i = 0; i < diasVisible; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      fechas.push(fecha);
    }
    return fechas;
  };

  const fechas = generarFechas();

  // Sincronizar fechaInicio cuando cambian los filtros de fecha
  useEffect(() => {
    console.log('🔍 Filtros recibidos:', { fechaFiltroDesde, fechaFiltroHasta });
    if (fechaFiltroDesde) {
      // Navegar a la fecha de inicio del filtro
      const nuevaFecha = new Date(fechaFiltroDesde + 'T00:00:00');
      console.log('📅 Navegando a fecha:', nuevaFecha);
      setFechaInicio(nuevaFecha);

      // Si hay rango de fechas, ajustar días visibles automáticamente
      if (fechaFiltroHasta) {
        const fin = new Date(fechaFiltroHasta + 'T00:00:00');
        const diasRango = Math.ceil((fin - nuevaFecha) / (1000 * 60 * 60 * 24)) + 1;
        console.log('📊 Días en rango:', diasRango);

        // Si el rango es mayor que los días visibles, ajustar
        if (diasRango > diasVisible) {
          if (diasRango <= 7) setDiasVisible(7);
          else if (diasRango <= 14) setDiasVisible(14);
          else if (diasRango <= 21) setDiasVisible(21);
          else setDiasVisible(30);
        }
      }
    }
  }, [fechaFiltroDesde, fechaFiltroHasta]);

  // Detectar tecla Ctrl y mouseup global
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control') setCtrlPressed(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Control') setCtrlPressed(false);
    };

    // MouseUp global para detectar cuando se suelta fuera de las celdas
    const handleGlobalMouseUp = () => {
      console.log('🔹 MouseUp Global - seleccionando:', seleccionando, 'seleccion.length:', seleccion.length);

      if (seleccionando && seleccion.length > 0) {
        console.log('✅ Procesando selección...', seleccion);

        // Procesar selección inline para evitar circular dependency
        try {
          // Agrupar por habitación
          const porHabitacion = {};

          seleccion.forEach(({ habitacionId, habitacion, fecha }) => {
            if (!porHabitacion[habitacionId]) {
              porHabitacion[habitacionId] = {
                habitacion,
                fechas: []
              };
            }
            porHabitacion[habitacionId].fechas.push(fecha);
          });

          // Ordenar fechas y calcular rango para cada habitación
          const reservasData = Object.entries(porHabitacion).map(([habitacionId, { habitacion, fechas }]) => {
            const fechasOrdenadas = fechas.sort();

            return {
              habitacion_id: parseInt(habitacionId),
              habitacion,
              fecha_entrada: fechasOrdenadas[0],
              fecha_salida: new Date(new Date(fechasOrdenadas[fechasOrdenadas.length - 1]).getTime() + 86400000)
                .toISOString().split('T')[0], // +1 día
              noches: fechasOrdenadas.length
            };
          });

          console.log('📊 Datos procesados:', reservasData);

          if (reservasData.length > 0) {
            console.log('🚀 Llamando onSelectionComplete con:', reservasData);
            onSelectionComplete(reservasData);
            setSeleccionando(false);
            setSeleccion([]); // Limpiar selección después de procesarla
          } else {
            console.warn('⚠️ No hay datos para procesar');
            setSeleccionando(false);
          }
        } catch (error) {
          console.error('❌ Error al procesar selección:', error);
          setErrorModal({ isOpen: true, message: 'Error al procesar la selección. Por favor intenta de nuevo.' });
          setSeleccionando(false);
        }
      } else {
        console.log('⏹️ Cancelando selección (no hay celdas seleccionadas o no está seleccionando)');
        setSeleccionando(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [seleccionando, seleccion, habitaciones, onSelectionComplete]);

  // Obtener estado de una celda (si tiene evento - reserva o hospedaje walk-in)
  const obtenerEstadoCelda = (habitacionId, fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];

    const evento = eventos.find(e => {
      // Filtrar eventos cancelados - no deben aparecer en el calendario
      if (e.estado === 'cancelada') return false;

      // Comparar como números para evitar problemas de tipos (string vs number)
      const habitacionMatch = parseInt(e.habitacion_id) === parseInt(habitacionId);

      if (!habitacionMatch) return false;

      // Manejar fechas correctamente sin problemas de timezone
      const entrada = e.fecha_entrada.split('T')[0];
      const salida = e.fecha_salida.split('T')[0];

      const enRango = fechaStr >= entrada && fechaStr < salida;

      return enRango;
    });

    if (!evento) return { estado: 'disponible', evento: null };

    // Walk-In siempre muestra como "ocupada"
    if (evento.es_walkIn) {
      return { estado: 'ocupada', evento };
    }

    return { estado: evento.estado, evento };
  };

  // Verificar si una celda está seleccionada
  const estaCeldaSeleccionada = (habitacionId, fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    return seleccion.some(
      s => s.habitacionId === habitacionId && s.fecha === fechaStr
    );
  };

  // Manejar click en celda con evento (reserva o walk-in)
  const handleCeldaClick = (evento) => {
    if (!evento) return;

    // Si es Walk-In, usar handler de hospedaje
    if (evento.es_walkIn && onHospedajeClick) {
      onHospedajeClick(evento);
    }
    // Si es reserva, usar handler de reserva
    else if (evento.es_reserva && onReservaClick) {
      onReservaClick(evento);
    }
  };

  // Manejar inicio de selección
  const handleMouseDown = (habitacion, fecha, estado, evento) => {
    // Si hay evento (reserva o walk-in) y se hace click, abrir detalles
    if (evento) {
      handleCeldaClick(evento);
      return;
    }

    // Si no es disponible y no hay evento, no hacer nada
    if (estado !== 'disponible') return;

    const fechaStr = fecha.toISOString().split('T')[0];

    if (ctrlPressed) {
      // Ctrl + Click: agregar/quitar de selección
      const yaSeleccionada = estaCeldaSeleccionada(habitacion.id, fecha);
      if (yaSeleccionada) {
        setSeleccion(seleccion.filter(
          s => !(s.habitacionId === habitacion.id && s.fecha === fechaStr)
        ));
      } else {
        setSeleccion([...seleccion, { habitacionId: habitacion.id, habitacion, fecha: fechaStr }]);
      }
    } else {
      // Click normal: nueva selección
      setSeleccionando(true);
      setSeleccion([{ habitacionId: habitacion.id, habitacion, fecha: fechaStr }]);
    }
  };

  // Manejar arrastre
  const handleMouseEnter = (habitacion, fecha, estado) => {
    if (!seleccionando || estado !== 'disponible') return;

    const fechaStr = fecha.toISOString().split('T')[0];

    // Solo agregar si no está ya seleccionada
    if (!estaCeldaSeleccionada(habitacion.id, fecha)) {
      console.log('➕ Agregando celda:', habitacion.id, fechaStr);
      setSeleccion([...seleccion, { habitacionId: habitacion.id, habitacion, fecha: fechaStr }]);
    }
  };

  // Navegar calendario
  const cambiarSemana = (direccion) => {
    const nuevaFecha = new Date(fechaInicio);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
    setFechaInicio(nuevaFecha);
  };

  const irHoy = () => {
    setFechaInicio(new Date());
  };

  // Formatear fecha para header
  const formatearFecha = (fecha) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return {
      dia: dias[fecha.getDay()],
      numero: fecha.getDate(),
      mes: meses[fecha.getMonth()]
    };
  };

  // Limpiar selección
  const limpiarSeleccion = () => {
    setSeleccion([]);
  };

  if (loading) {
    return <div className="calendario-loading">Cargando calendario...</div>;
  }

  return (
    <div className="calendario-grid-container">
      {/* Toolbar */}
      <div className="calendario-toolbar">
        <div className="calendario-nav">
          <button onClick={() => cambiarSemana(-1)} className="nav-btn">← Anterior</button>
          <button onClick={irHoy} className="nav-btn">Hoy</button>
          <button onClick={() => cambiarSemana(1)} className="nav-btn">Siguiente →</button>
        </div>

        {/* SIMPLIFICADO Sprint 2: Filtro de habitación y selector de días ocultados */}
        {/* <div className="calendario-zoom">
          <label>Habitación:</label>
          <select value={habitacionFiltro} onChange={(e) => setHabitacionFiltro(e.target.value)}>
            <option value="">Todas las habitaciones</option>
            {todasHabitaciones.map(hab => (
              <option key={hab.id} value={hab.id}>#{hab.numero} - {hab.tipo}</option>
            ))}
          </select>
        </div>
        <div className="calendario-zoom">
          <label>Días visibles:</label>
          <select value={diasVisible} onChange={(e) => setDiasVisible(parseInt(e.target.value))}>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="21">21 días</option>
            <option value="30">30 días</option>
          </select>
        </div> */}

        {seleccion.length > 0 && (
          <div className="calendario-seleccion-info">
            <span>{seleccion.length} celda{seleccion.length > 1 ? 's' : ''} seleccionada{seleccion.length > 1 ? 's' : ''}</span>
            <button onClick={limpiarSeleccion} className="btn-limpiar">Limpiar</button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        className="calendario-grid"
        ref={gridRef}
      >
        {/* Header con fechas */}
        <div className="grid-header">
          <div className="header-habitacion">Habitación</div>
          {fechas.map((fecha, idx) => {
            const { dia, numero, mes } = formatearFecha(fecha);
            const esHoy = fecha.toDateString() === new Date().toDateString();

            return (
              <div key={idx} className={`header-fecha ${esHoy ? 'hoy' : ''}`}>
                <div className="fecha-dia">{dia}</div>
                <div className="fecha-numero">{numero}</div>
                <div className="fecha-mes">{mes}</div>
              </div>
            );
          })}
        </div>

        {/* Filas de habitaciones */}
        {habitaciones.map((habitacion) => (
          <div key={habitacion.id} className="grid-row">
            <div className="celda-habitacion">
              <div className="hab-numero">#{habitacion.numero}</div>
              <div className="hab-tipo">{habitacion.tipo}</div>
              <div className="hab-piso">Piso {habitacion.piso}</div>
            </div>

            {fechas.map((fecha, idx) => {
              const { estado, evento } = obtenerEstadoCelda(habitacion.id, fecha);
              const seleccionada = estaCeldaSeleccionada(habitacion.id, fecha);

              return (
                <div
                  key={idx}
                  className={`celda-fecha estado-${estado} ${seleccionada ? 'seleccionada' : ''} ${evento ? 'clickable' : ''} ${evento?.es_walkIn ? 'walk-in' : ''}`}
                  onMouseDown={() => handleMouseDown(habitacion, fecha, estado, evento)}
                  onMouseEnter={() => handleMouseEnter(habitacion, fecha, estado)}
                  title={evento ? `${evento.huesped?.nombre_completo || (evento.es_walkIn ? 'Walk-In' : 'Reserva')} - ${evento.codigo}` : ''}
                >
                  {evento && (
                    <div className={`celda-evento-info ${evento.es_walkIn ? 'walk-in' : ''}`}>
                      {evento.es_walkIn && <span className="walk-in-icon">W</span>}
                      {evento.huesped?.nombre_completo?.substring(0, evento.es_walkIn ? 8 : 10) || evento.codigo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="calendario-leyenda">
        <div className="leyenda-item">
          <span className="leyenda-color estado-disponible"></span>
          <span>Disponible</span>
        </div>
        <div className="leyenda-item">
          <span className="leyenda-color estado-pendiente"></span>
          <span>Pendiente</span>
        </div>
        <div className="leyenda-item">
          <span className="leyenda-color estado-confirmada"></span>
          <span>Confirmada</span>
        </div>
        <div className="leyenda-item">
          <span className="leyenda-color estado-en_curso"></span>
          <span>En Curso</span>
        </div>
        <div className="leyenda-item walk-in-legend">
          <span className="leyenda-color estado-ocupada walk-in-color"></span>
          <span><strong>W</strong> Walk-In</span>
        </div>
        <div className="leyenda-item">
          <span className="leyenda-color estado-finalizada"></span>
          <span>Finalizada</span>
        </div>
        <div className="leyenda-item">
          <span className="leyenda-color seleccionada"></span>
          <span>Seleccionada</span>
        </div>
      </div>

      {/* Ayuda */}
      <div className="calendario-ayuda">
        <p><strong>Tip:</strong> Click y arrastra para seleccionar múltiples noches. Click en una celda con reserva para ver los detalles.</p>
      </div>

      {/* Modal de error */}
      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
      />
    </div>
  );
}

export default CalendarioGrid;