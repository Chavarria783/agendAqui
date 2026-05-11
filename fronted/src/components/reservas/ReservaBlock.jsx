import { useRef } from 'react';

const ESTADO_COLORS = {
  pendiente:  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  confirmada: { bg: '#2563eb', border: '#3b82f6', text: '#ffffff' },
  en_curso:   { bg: '#059669', border: '#10b981', text: '#ffffff' },
  finalizada: { bg: '#e5e7eb', border: '#9ca3af', text: '#6b7280' },
  no_show:    { bg: '#fecaca', border: '#dc2626', text: '#991b1b' },
  ocupada:    { bg: '#7c3aed', border: '#8b5cf6', text: '#ffffff' }, // Walk-in
};

function ReservaBlock({
  evento,
  left,
  width,
  height,
  rowDensity,
  isSearchMatch,
  isDragging,
  onPointerDown,
  onClick,
  dayWidth,
  lane = 0,
  laneHeight = 36,
  multiLane = false
}) {
  const blockRef = useRef(null);
  const RESIZE_ZONE = 8;

  const colors = evento.es_walkIn
    ? ESTADO_COLORS.ocupada
    : (ESTADO_COLORS[evento.estado] || ESTADO_COLORS.pendiente);

  const handlePointerDown = (e) => {
    if (!onPointerDown) {
      // Drag deshabilitado - tratar como click
      e.stopPropagation();
      if (onClick) onClick();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const isResize = (e.clientX - rect.left) > (rect.width - RESIZE_ZONE);
    onPointerDown(isResize ? 'resize' : 'move', e);
  };

  const nombreHuesped = evento.huesped?.nombre_completo
    || (evento.es_walkIn ? 'Walk-In' : evento.codigo);
  const canal = evento.canal_reserva || '';
  const showDetails = width > 80 && rowDensity !== 'compact';
  const showCanal = width > 140 && rowDensity === 'expanded';

  // Indicador de pago
  const anticipo = evento.anticipo || 0;
  const total = evento.precio_total || 0;
  let paymentClass = '';
  if (total > 0 && anticipo === 0) paymentClass = 'reserva-block__payment--none';
  else if (total > 0 && anticipo < total) paymentClass = 'reserva-block__payment--partial';

  return (
    <div
      ref={blockRef}
      className={`reserva-block reserva-block--${evento.es_walkIn ? 'walkin' : evento.estado} ${isSearchMatch ? 'reserva-block--highlight' : ''} ${isDragging ? 'reserva-block--dragging' : ''}`}
      style={{
        position: 'absolute',
        left: left + 1,
        top: multiLane ? 4 + lane * (laneHeight + 2) : 4,
        width,
        height,
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        color: colors.text,
        cursor: 'pointer',
        zIndex: isDragging ? 10 : 2,
        opacity: isDragging ? 0.4 : 1,
      }}
      onPointerDown={(evento.es_reserva || evento.es_walkIn) ? handlePointerDown : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      title={`${nombreHuesped} — ${evento.codigo}\n${evento.fecha_entrada.split('T')[0]} → ${evento.fecha_salida.split('T')[0]} (${evento.noches} noches)`}
    >
      <div className="reserva-block__content">
        <span className="reserva-block__name">{nombreHuesped}</span>
        {showDetails && (
          <span className="reserva-block__detail">
            {evento.habitacion?.tipo}
            {showCanal && canal && ` · ${canal}`}
          </span>
        )}
      </div>

      {/* SIMPLIFICADO Sprint 2: Indicador de pago y resize handle ocultados */}

      {/* Walk-in indicator */}
      {evento.es_walkIn && (
        <span className="reserva-block__walkin-badge">W</span>
      )}
    </div>
  );
}

export default ReservaBlock;
