import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_HABITACIONES } from '../../graphql/habitaciones';
import { ACTUALIZAR_RESERVA } from '../../graphql/reservas';
import { CAMBIAR_HABITACION_HOSPEDAJE } from '../../graphql/hospedajes';
import ReservaBlock from './ReservaBlock';
import ConfirmModal from '../shared/ConfirmModal';
import SuccessModal from '../shared/SuccessModal';
import {
  ChevronLeft, ChevronRight, CalendarDays
} from 'lucide-react';
import './CalendarioTimeline.css';

// --- Constants ---
const ROOM_LABEL_WIDTH = 140;
const DIAS_VISIBLES = 30;
const HEADER_HEIGHT = 52;
const ROW_HEIGHTS = { compact: 44, normal: 60, expanded: 80 };
const LANE_HEIGHTS = { compact: 28, normal: 36, expanded: 48 };
const LANE_GAP = 2;
const ROW_PADDING = 8;
const MS_PER_DAY = 86400000;

// Assign lanes to overlapping events (greedy interval scheduling)
function calcLanes(eventos) {
  const sorted = [...eventos].sort((a, b) =>
    a.fecha_entrada.localeCompare(b.fecha_entrada)
  );
  const lanes = [];
  const laneMap = new Map();

  for (const ev of sorted) {
    const entrada = ev.fecha_entrada.split('T')[0];
    let assigned = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] <= entrada) {
        assigned = i;
        break;
      }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push(null);
    }
    lanes[assigned] = ev.fecha_salida.split('T')[0];
    laneMap.set(ev.id, assigned);
  }

  return { laneMap, maxLanes: Math.max(lanes.length, 1) };
}

const toDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function CalendarioTimeline({
  onSelectionComplete,
  eventos = [],
  onReservaClick,
  onHospedajeClick,
  fechaFiltroDesde,
  fechaFiltroHasta,
  refetchEventos,
  onNuevaReserva
}) {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() - 2);
    return hoy;
  });
  const [zoomLevel, setZoomLevel] = useState(80);
  const [rowDensity, setRowDensity] = useState('normal');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccion, setSeleccion] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);
  const [pendingChange, setPendingChange] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  const scrollRef = useRef(null);
  const bodyRef = useRef(null);

  const { data: habitacionesData, loading } = useQuery(GET_HABITACIONES);
  const [actualizarReserva] = useMutation(ACTUALIZAR_RESERVA);
  const [cambiarHabitacionHospedaje] = useMutation(CAMBIAR_HABITACION_HOSPEDAJE);

  const habitaciones = habitacionesData?.habitaciones || [];
  const rowHeight = ROW_HEIGHTS[rowDensity];
  const dayWidth = zoomLevel;
  const totalGridWidth = DIAS_VISIBLES * dayWidth;

  const fechas = useMemo(() => {
    const arr = [];
    for (let i = 0; i < DIAS_VISIBLES; i++) {
      const d = new Date(fechaInicio);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [fechaInicio]);

  useEffect(() => {
    if (fechaFiltroDesde) {
      const d = parseDate(fechaFiltroDesde);
      d.setDate(d.getDate() - 2);
      setFechaInicio(d);
    }
  }, [fechaFiltroDesde, fechaFiltroHasta]);

  const eventosFiltrados = useMemo(() => {
    let filtered = eventos.filter(e => e.estado !== 'cancelada');
    if (filtroEstado) {
      filtered = filtered.filter(e => e.estado === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(e =>
        e.huesped?.nombre_completo?.toLowerCase().includes(q) ||
        e.codigo?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [eventos, filtroEstado, busqueda]);

  const eventosPorHabitacion = useMemo(() => {
    const map = {};
    eventosFiltrados.forEach(ev => {
      const habId = parseInt(ev.habitacion_id);
      if (!map[habId]) map[habId] = [];
      map[habId].push(ev);
    });
    const result = {};
    for (const habId of Object.keys(map)) {
      const { laneMap, maxLanes } = calcLanes(map[habId]);
      result[habId] = { eventos: map[habId], laneMap, maxLanes };
    }
    return result;
  }, [eventosFiltrados]);

  const laneHeight = LANE_HEIGHTS[rowDensity];

  const getRowHeight = useCallback((hab) => {
    const habData = eventosPorHabitacion[parseInt(hab.id)];
    const maxLanes = habData?.maxLanes || 1;
    if (maxLanes <= 1) return ROW_HEIGHTS[rowDensity];
    return maxLanes * (laneHeight + LANE_GAP) + ROW_PADDING;
  }, [eventosPorHabitacion, rowDensity, laneHeight]);

  const rowOffsets = useMemo(() => {
    const offsets = [];
    let acc = 0;
    habitaciones.forEach(hab => {
      offsets.push(acc);
      acc += getRowHeight(hab);
    });
    offsets.push(acc);
    return offsets;
  }, [habitaciones, getRowHeight]);

  const calcBlockPosition = useCallback((evento) => {
    const entrada = parseDate(evento.fecha_entrada.split('T')[0]);
    const salida = parseDate(evento.fecha_salida.split('T')[0]);
    const inicioGrid = new Date(fechaInicio);
    inicioGrid.setHours(0, 0, 0, 0);

    const diffStart = (entrada - inicioGrid) / MS_PER_DAY;
    const noches = (salida - entrada) / MS_PER_DAY;

    let left = diffStart * dayWidth;
    let width = (noches + 1) * dayWidth;

    if (left < 0) { width += left; left = 0; }
    if (left + width > totalGridWidth) { width = totalGridWidth - left; }
    if (width <= 0 || left >= totalGridWidth) return null;

    return { left, width: Math.max(width - 2, 20) };
  }, [fechaInicio, dayWidth, totalGridWidth]);

  // Navigation
  const navegarSemana = (dir) => {
    const d = new Date(fechaInicio);
    d.setDate(d.getDate() + dir * 7);
    setFechaInicio(d);
  };

  const irHoy = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    setFechaInicio(d);
  };

  const handleFechaInicioChange = (e) => {
    const d = parseDate(e.target.value);
    if (!isNaN(d.getTime())) setFechaInicio(d);
  };

  // Block click
  const handleBlockClick = useCallback((evento) => {
    if (evento.es_walkIn && onHospedajeClick) {
      onHospedajeClick(evento);
    } else if (evento.es_reserva && onReservaClick) {
      onReservaClick(evento);
    }
  }, [onReservaClick, onHospedajeClick]);

  // Drag & Drop
  const handleDragStart = useCallback((evento, type, e) => {
    if (!evento.es_reserva && !evento.es_walkIn) return;
    if (evento.es_walkIn && type === 'resize') return;

    const pos = calcBlockPosition(evento);
    if (!pos) return;

    setDragState({
      eventoId: evento.id,
      evento,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: pos.left,
      startWidth: pos.width,
      originalHabitacionId: parseInt(evento.habitacion_id),
    });
  }, [calcBlockPosition]);

  const handleDragMove = useCallback((e) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const bodyEl = bodyRef.current;
    if (!bodyEl) return;
    const bodyRect = bodyEl.getBoundingClientRect();
    const relativeY = e.clientY - bodyRect.top + bodyEl.scrollTop;

    let newRoomIdx = 0;
    for (let i = 0; i < habitaciones.length; i++) {
      if (relativeY >= rowOffsets[i] && relativeY < rowOffsets[i + 1]) {
        newRoomIdx = i;
        break;
      }
      if (i === habitaciones.length - 1) newRoomIdx = i;
    }

    const targetHab = habitaciones[newRoomIdx];
    const targetCapacidad = targetHab?.capacidad || 1;
    const targetRowH = getRowHeight(targetHab);

    if (dragState.type === 'move') {
      const newLeft = Math.max(0, Math.min(
        dragState.startLeft + deltaX,
        totalGridWidth - dragState.startWidth
      ));
      const dayOffset = Math.round(newLeft / dayWidth) - Math.round(dragState.startLeft / dayWidth);

      const entrada = parseDate(dragState.evento.fecha_entrada.split('T')[0]);
      const salida = parseDate(dragState.evento.fecha_salida.split('T')[0]);
      const newEntrada = new Date(entrada);
      newEntrada.setDate(newEntrada.getDate() + dayOffset);
      const newSalida = new Date(salida);
      newSalida.setDate(newSalida.getDate() + dayOffset);

      const newHabId = parseInt(targetHab?.id);
      const overlappingCount = eventosFiltrados.filter(ev => {
        if (ev.id === dragState.eventoId) return false;
        if (parseInt(ev.habitacion_id) !== newHabId) return false;
        const evEntrada = ev.fecha_entrada.split('T')[0];
        const evSalida = ev.fecha_salida.split('T')[0];
        return toDateStr(newEntrada) < evSalida && toDateStr(newSalida) > evEntrada;
      }).length;
      const hasConflict = overlappingCount >= targetCapacidad;

      setGhostPos({
        left: Math.round(newLeft / dayWidth) * dayWidth,
        top: rowOffsets[newRoomIdx],
        width: dragState.startWidth,
        height: targetRowH - 8,
        valid: !hasConflict,
        newRoomIdx,
        dayOffset
      });

    } else if (dragState.type === 'resize') {
      const newWidth = Math.max(dayWidth, dragState.startWidth + deltaX);
      const snappedWidth = Math.round(newWidth / dayWidth) * dayWidth;
      const newNoches = Math.max(1, Math.round(snappedWidth / dayWidth) - 1);

      const entrada = parseDate(dragState.evento.fecha_entrada.split('T')[0]);
      const newSalida = new Date(entrada);
      newSalida.setDate(newSalida.getDate() + newNoches);

      const habId = parseInt(dragState.evento.habitacion_id);
      const currentHab = habitaciones.find(h => parseInt(h.id) === habId);
      const currentCapacidad = currentHab?.capacidad || 1;
      const overlappingCount = eventosFiltrados.filter(ev => {
        if (ev.id === dragState.eventoId) return false;
        if (parseInt(ev.habitacion_id) !== habId) return false;
        const evEntrada = ev.fecha_entrada.split('T')[0];
        const evSalida = ev.fecha_salida.split('T')[0];
        return toDateStr(entrada) < evSalida && toDateStr(newSalida) > evEntrada;
      }).length;
      const hasConflict = overlappingCount >= currentCapacidad;

      const currentRoomIdx = habitaciones.findIndex(h => parseInt(h.id) === habId);
      const currentRowH = getRowHeight(currentHab);

      setGhostPos({
        left: dragState.startLeft,
        top: rowOffsets[currentRoomIdx],
        width: snappedWidth - 2,
        height: currentRowH - 8,
        valid: !hasConflict,
        newRoomIdx: currentRoomIdx,
        dayOffset: 0,
        newNoches
      });
    }
  }, [dragState, dayWidth, totalGridWidth, habitaciones, eventosFiltrados, rowOffsets, getRowHeight]);

  const handleDragEnd = useCallback((e) => {
    if (!dragState) return;

    const deltaX = Math.abs(e.clientX - dragState.startX);
    const deltaY = Math.abs(e.clientY - dragState.startY);

    if (deltaX < 5 && deltaY < 5) {
      handleBlockClick(dragState.evento);
      setDragState(null);
      setGhostPos(null);
      return;
    }

    if (!ghostPos) { setDragState(null); return; }

    if (!ghostPos.valid) {
      setErrorModal({ isOpen: true, message: 'No se puede mover aqui: la habitacion no tiene disponibilidad para esas fechas.' });
      setDragState(null);
      setGhostPos(null);
      return;
    }

    const input = {};
    const cambios = [];
    const evento = dragState.evento;
    const entradaOriginal = evento.fecha_entrada.split('T')[0];
    const salidaOriginal = evento.fecha_salida.split('T')[0];

    if (dragState.type === 'move') {
      const newRoom = habitaciones[ghostPos.newRoomIdx];
      const roomChanged = parseInt(newRoom.id) !== dragState.originalHabitacionId;

      if (evento.es_walkIn) {
        if (roomChanged) {
          input.nueva_habitacion_id = parseInt(newRoom.id);
          const oldRoom = habitaciones.find(h => parseInt(h.id) === dragState.originalHabitacionId);
          cambios.push(`Habitacion: #${oldRoom?.numero} (${oldRoom?.tipo}) → #${newRoom.numero} (${newRoom.tipo})`);
        }
      } else {
        const entrada = parseDate(entradaOriginal);
        const salida = parseDate(salidaOriginal);
        entrada.setDate(entrada.getDate() + ghostPos.dayOffset);
        salida.setDate(salida.getDate() + ghostPos.dayOffset);

        input.fecha_entrada = toDateStr(entrada);
        input.fecha_salida = toDateStr(salida);

        if (roomChanged) {
          input.habitacion_id = parseInt(newRoom.id);
          const oldRoom = habitaciones.find(h => parseInt(h.id) === dragState.originalHabitacionId);
          cambios.push(`Habitacion: #${oldRoom?.numero} (${oldRoom?.tipo}) → #${newRoom.numero} (${newRoom.tipo})`);
        }

        if (ghostPos.dayOffset !== 0) {
          cambios.push(`Entrada: ${entradaOriginal} → ${input.fecha_entrada}`);
          cambios.push(`Salida: ${salidaOriginal} → ${input.fecha_salida}`);
        }
      }
    } else if (dragState.type === 'resize') {
      const entrada = parseDate(entradaOriginal);
      const newNoches = ghostPos.newNoches != null ? ghostPos.newNoches : Math.max(1, Math.round(ghostPos.width / dayWidth) - 1);
      const newSalida = new Date(entrada);
      newSalida.setDate(newSalida.getDate() + newNoches);
      input.fecha_salida = toDateStr(newSalida);

      cambios.push(`Salida: ${salidaOriginal} → ${input.fecha_salida}`);
      cambios.push(`Noches: ${evento.noches} → ${newNoches}`);
    }

    if (Object.keys(input).length > 0 && cambios.length > 0) {
      setPendingChange({
        eventoId: dragState.eventoId,
        evento,
        input,
        cambios,
        esHospedaje: !!evento.es_walkIn
      });
    }

    setDragState(null);
    setGhostPos(null);
  }, [dragState, ghostPos, habitaciones, dayWidth, handleBlockClick]);

  const ejecutarCambioPendiente = useCallback(async () => {
    if (!pendingChange) return;

    setIsUpdating(true);
    try {
      if (pendingChange.esHospedaje) {
        await cambiarHabitacionHospedaje({
          variables: {
            id: parseInt(pendingChange.eventoId),
            nueva_habitacion_id: pendingChange.input.nueva_habitacion_id
          }
        });
      } else {
        await actualizarReserva({
          variables: {
            id: parseInt(pendingChange.eventoId),
            input: pendingChange.input
          }
        });
      }
      if (refetchEventos) await refetchEventos();
      setPendingChange(null);
      setSuccessModal({ isOpen: true, message: pendingChange.esHospedaje ? 'Hospedaje movido correctamente.' : 'Reserva actualizada correctamente.' });
    } catch (err) {
      setPendingChange(null);
      setErrorModal({ isOpen: true, message: err.message || 'Error al actualizar.' });
    } finally {
      setIsUpdating(false);
    }
  }, [pendingChange, actualizarReserva, cambiarHabitacionHospedaje, refetchEventos]);

  // Window-level listeners for drag
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => handleDragMove(e);
    const onUp = (e) => handleDragEnd(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  // Empty cell selection
  const handleCellMouseDown = useCallback((habitacion, fecha) => {
    if (dragState) return;
    const fechaStr = toDateStr(fecha);
    const habId = parseInt(habitacion.id);
    const hasEvent = eventosFiltrados.some(ev => {
      const entrada = ev.fecha_entrada.split('T')[0];
      const salida = ev.fecha_salida.split('T')[0];
      return parseInt(ev.habitacion_id) === habId && fechaStr >= entrada && fechaStr < salida;
    });
    if (hasEvent) return;

    setSeleccionando(true);
    setSeleccion([{ habitacionId: habitacion.id, habitacion, fecha: fechaStr }]);
  }, [eventosFiltrados, dragState]);

  const handleCellMouseEnter = useCallback((habitacion, fecha) => {
    if (!seleccionando) return;
    const fechaStr = toDateStr(fecha);
    if (seleccion.some(s => s.habitacionId === habitacion.id && s.fecha === fechaStr)) return;

    const habId = parseInt(habitacion.id);
    const hasEvent = eventosFiltrados.some(ev => {
      const entrada = ev.fecha_entrada.split('T')[0];
      const salida = ev.fecha_salida.split('T')[0];
      return parseInt(ev.habitacion_id) === habId && fechaStr >= entrada && fechaStr < salida;
    });
    if (hasEvent) return;

    setSeleccion(prev => [...prev, { habitacionId: habitacion.id, habitacion, fecha: fechaStr }]);
  }, [seleccionando, seleccion, eventosFiltrados]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (!seleccionando || seleccion.length === 0) {
        setSeleccionando(false);
        return;
      }

      const porHabitacion = {};
      seleccion.forEach(({ habitacionId, habitacion, fecha }) => {
        if (!porHabitacion[habitacionId]) {
          porHabitacion[habitacionId] = { habitacion, fechas: [] };
        }
        porHabitacion[habitacionId].fechas.push(fecha);
      });

      const reservasData = Object.entries(porHabitacion).map(([habitacionId, { habitacion, fechas }]) => {
        const fechasOrdenadas = fechas.sort();
        return {
          habitacion_id: parseInt(habitacionId),
          habitacion,
          fecha_entrada: fechasOrdenadas[0],
          fecha_salida: toDateStr(
            new Date(parseDate(fechasOrdenadas[fechasOrdenadas.length - 1]).getTime() + MS_PER_DAY)
          ),
          noches: fechasOrdenadas.length
        };
      });

      if (reservasData.length > 0 && onSelectionComplete) {
        onSelectionComplete(reservasData);
      }

      setSeleccionando(false);
      setSeleccion([]);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [seleccionando, seleccion, onSelectionComplete]);

  // Helpers
  const formatDayHeader = (fecha) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return {
      dia: dias[fecha.getDay()],
      numero: fecha.getDate(),
      mes: meses[fecha.getMonth()],
      esHoy: toDateStr(fecha) === toDateStr(new Date()),
      esFinSemana: fecha.getDay() === 0 || fecha.getDay() === 6
    };
  };

  const isCellSelected = (habitacionId, fecha) => {
    const fechaStr = toDateStr(fecha);
    return seleccion.some(s => s.habitacionId === habitacionId && s.fecha === fechaStr);
  };

  const todayLineLeft = useMemo(() => {
    const hoy = new Date();
    const inicioGrid = new Date(fechaInicio);
    inicioGrid.setHours(0, 0, 0, 0);
    const diff = (hoy - inicioGrid) / MS_PER_DAY;
    if (diff >= 0 && diff <= DIAS_VISIBLES) return ROOM_LABEL_WIDTH + diff * dayWidth;
    return null;
  }, [fechaInicio, dayWidth]);

  if (loading) {
    return <div className="calendario-loading">Cargando calendario...</div>;
  }

  return (
    <div className="timeline-container">
      {/* TOOLBAR */}
      <div className="timeline-toolbar">
        <div className="timeline-toolbar__left">
          <div className="timeline-toolbar__date">
            <CalendarDays size={16} />
            <span>Desde:</span>
            <input
              type="date"
              value={toDateStr(fechaInicio)}
              onChange={handleFechaInicioChange}
              className="timeline-date-input"
            />
          </div>

          <div className="timeline-toolbar__nav">
            <button onClick={() => navegarSemana(-1)} className="timeline-nav-btn" title="Semana anterior">
              <ChevronLeft size={18} />
            </button>
            <button onClick={irHoy} className="timeline-nav-btn timeline-nav-btn--today">
              Hoy
            </button>
            <button onClick={() => navegarSemana(1)} className="timeline-nav-btn" title="Semana siguiente">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* SIMPLIFICADO Sprint 2: Filtro de estado ocultado */}
          {/* <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="timeline-filter-select"
          >
            <option value="">Todas las reservas</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="en_curso">En Curso</option>
            <option value="finalizada">Finalizadas</option>
            <option value="no_show">No Show</option>
          </select> */}
        </div>

        <div className="timeline-toolbar__right">
          {/* SIMPLIFICADO Sprint 2: Controles de densidad, zoom y búsqueda ocultados */}
          {/* <div className="timeline-toolbar__density">
            <button className={`timeline-density-btn ${rowDensity === 'compact' ? 'active' : ''}`} onClick={() => setRowDensity('compact')} title="Compacto"><LayoutGrid size={16} /></button>
            <button className={`timeline-density-btn ${rowDensity === 'normal' ? 'active' : ''}`} onClick={() => setRowDensity('normal')} title="Normal"><Rows size={16} /></button>
            <button className={`timeline-density-btn ${rowDensity === 'expanded' ? 'active' : ''}`} onClick={() => setRowDensity('expanded')} title="Expandido"><AlignJustify size={16} /></button>
          </div>
          <div className="timeline-toolbar__zoom">
            <ZoomOut size={14} />
            <input type="range" min="40" max="120" step="5" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className="timeline-zoom-slider" title={`Zoom: ${zoomLevel}px/dia`} />
            <ZoomIn size={14} />
          </div>
          <div className="timeline-toolbar__search">
            <Search size={14} />
            <input type="text" placeholder="Buscar huesped o reserva..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="timeline-search-input" />
          </div> */}

          {onNuevaReserva && (
            <button className="timeline-toolbar__nueva-btn" onClick={onNuevaReserva}>
              + Nueva Reserva
            </button>
          )}
        </div>
      </div>

      {/* TIMELINE GRID */}
      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-grid" style={{ width: ROOM_LABEL_WIDTH + totalGridWidth }}>

          {/* Header row */}
          <div className="timeline-header-row" style={{ height: HEADER_HEIGHT }}>
            <div className="timeline-corner" style={{ width: ROOM_LABEL_WIDTH, height: HEADER_HEIGHT }}>
              Habitacion
            </div>
            <div className="timeline-days-header" style={{ width: totalGridWidth }}>
              {fechas.map((fecha, idx) => {
                const { dia, numero, mes, esHoy, esFinSemana } = formatDayHeader(fecha);
                return (
                  <div
                    key={idx}
                    className={`timeline-day-col ${esHoy ? 'timeline-day-col--today' : ''} ${esFinSemana ? 'timeline-day-col--weekend' : ''}`}
                    style={{ width: dayWidth }}
                  >
                    <span className="timeline-day-name">{dia}</span>
                    <span className="timeline-day-number">{numero}</span>
                    {dayWidth >= 60 && <span className="timeline-day-month">{mes}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body rows */}
          <div className="timeline-body" ref={bodyRef} style={{ position: 'relative' }}>
            {habitaciones.map((hab) => {
              const habData = eventosPorHabitacion[parseInt(hab.id)];
              const habEventos = habData?.eventos || [];
              const habLaneMap = habData?.laneMap || new Map();
              const habMaxLanes = habData?.maxLanes || 1;
              const habRowHeight = getRowHeight(hab);

              return (
                <div key={hab.id} className="timeline-row" style={{ height: habRowHeight }}>
                  <div className="timeline-room-label" style={{ width: ROOM_LABEL_WIDTH, height: habRowHeight }}>
                    <span className="timeline-room-number">#{hab.numero}</span>
                    <span className="timeline-room-type">{hab.tipo}</span>
                    {hab.capacidad > 1 && (
                      <span className="timeline-room-capacity">{hab.capacidad} camas</span>
                    )}
                  </div>

                  <div
                    className="timeline-room-track"
                    style={{ width: totalGridWidth, height: habRowHeight }}
                  >
                    {fechas.map((fecha, idx) => {
                      const { esHoy, esFinSemana } = formatDayHeader(fecha);
                      const selected = isCellSelected(hab.id, fecha);

                      return (
                        <div
                          key={idx}
                          className={`timeline-cell ${esHoy ? 'timeline-cell--today' : ''} ${esFinSemana ? 'timeline-cell--weekend' : ''} ${selected ? 'timeline-cell--selected' : ''}`}
                          style={{ width: dayWidth, height: habRowHeight }}
                          onMouseDown={() => handleCellMouseDown(hab, fecha)}
                          onMouseEnter={() => handleCellMouseEnter(hab, fecha)}
                        />
                      );
                    })}

                    {habEventos.map(evento => {
                      const pos = calcBlockPosition(evento);
                      if (!pos) return null;

                      const isSearchMatch = busqueda.trim() && (
                        evento.huesped?.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
                        evento.codigo?.toLowerCase().includes(busqueda.toLowerCase())
                      );
                      const isDragging = dragState?.eventoId === evento.id;
                      const lane = habLaneMap.get(evento.id) || 0;
                      const blockHeight = habMaxLanes > 1 ? laneHeight : habRowHeight - 8;

                      return (
                        <ReservaBlock
                          key={`${evento.tipo || (evento.es_walkIn ? 'h' : 'r')}-${evento.id}`}
                          evento={evento}
                          left={pos.left}
                          width={pos.width}
                          height={blockHeight}
                          rowDensity={rowDensity}
                          isSearchMatch={isSearchMatch}
                          isDragging={isDragging}
                          /* SIMPLIFICADO Sprint 2: Drag & drop deshabilitado */
                          onPointerDown={null}
                          onClick={() => handleBlockClick(evento)}
                          dayWidth={dayWidth}
                          lane={lane}
                          laneHeight={laneHeight}
                          multiLane={habMaxLanes > 1}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* SIMPLIFICADO Sprint 2: Ghost element de drag deshabilitado */}
          </div>

          {/* Today line */}
          {todayLineLeft !== null && (
            <div className="timeline-today-line" style={{ left: todayLineLeft }} />
          )}
        </div>
      </div>

      {/* LEGEND */}
      <div className="timeline-legend">
        <div className="timeline-legend__item">
          <span className="timeline-legend__color timeline-legend__color--pendiente" />
          <span>Pendiente</span>
        </div>
        <div className="timeline-legend__item">
          <span className="timeline-legend__color timeline-legend__color--confirmada" />
          <span>Confirmada</span>
        </div>
        <div className="timeline-legend__item">
          <span className="timeline-legend__color timeline-legend__color--en_curso" />
          <span>En Curso</span>
        </div>
        <div className="timeline-legend__item">
          <span className="timeline-legend__color timeline-legend__color--walkin" />
          <span>Walk-In</span>
        </div>
        <div className="timeline-legend__item">
          <span className="timeline-legend__color timeline-legend__color--finalizada" />
          <span>Finalizada</span>
        </div>
        <div className="timeline-legend__item">
          <span className="timeline-legend__color timeline-legend__color--selected" />
          <span>Seleccionada</span>
        </div>
        <div className="timeline-legend__tip">
          <strong>Tip:</strong> Click en celda vacía y arrastra para crear nueva reserva. Click en un bloque para ver los detalles.
        </div>
      </div>

      {/* SIMPLIFICADO Sprint 2: Modales de confirmación de drag deshabilitados */}
    </div>
  );
}

export default CalendarioTimeline;
