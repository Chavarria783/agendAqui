import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_METODOS_PAGO } from '../../graphql/metodosPago';
import Input from '../shared/Input';
import Button from '../shared/Button';
import { CreditCard, DollarSign, Trash2, Plus, Banknote, ArrowRightLeft } from 'lucide-react';
import './SeleccionMetodosPago.css';

function SeleccionMetodosPago({ totalAPagar, metodosSeleccionados, onMetodosChange }) {
  const [metodos, setMetodos] = useState(metodosSeleccionados || []);

  // Sincronizar cuando el padre resetea los métodos
  useEffect(() => {
    setMetodos(metodosSeleccionados || []);
  }, [metodosSeleccionados]);

  // Función helper para obtener el ícono apropiado con fallback híbrido
  const getPaymentIcon = (metodoPago) => {
    if (!metodoPago) return <DollarSign size={16} />;

    // Estrategia híbrida: usar 'tipo' como fallback si 'icono' no existe o es inválido
    const tipo = metodoPago.tipo?.toLowerCase() || 'otro';

    // Mapeo de tipos a íconos de lucide-react
    const iconMap = {
      'efectivo': <Banknote size={16} />,
      'tarjeta': <CreditCard size={16} />,
      'transferencia': <ArrowRightLeft size={16} />,
      'otro': <DollarSign size={16} />
    };

    // Retornar ícono basado en tipo, o default si no existe
    return iconMap[tipo] || <DollarSign size={16} />;
  };

  const { data: metodosPagoData, loading } = useQuery(GET_METODOS_PAGO, {
    variables: { activo: true }
  });

  const metodosPagoDisponibles = metodosPagoData?.metodosPago || [];

  useEffect(() => {
    if (onMetodosChange) {
      onMetodosChange(metodos);
    }
  }, [metodos, onMetodosChange]);

  const agregarMetodo = () => {
    const nuevoMetodo = {
      metodo_pago_id: '',
      nombre: '',
      monto: 0,
      referencia: ''
    };
    setMetodos([...metodos, nuevoMetodo]);
  };

  const eliminarMetodo = (index) => {
    const nuevosMetodos = metodos.filter((_, i) => i !== index);
    setMetodos(nuevosMetodos);
  };

  const actualizarMetodo = (index, campo, valor) => {
    const nuevosMetodos = [...metodos];

    if (campo === 'metodo_pago_id') {
      const metodoPago = metodosPagoDisponibles.find(m => m.id === parseInt(valor));
      nuevosMetodos[index] = {
        ...nuevosMetodos[index],
        metodo_pago_id: parseInt(valor),
        nombre: metodoPago?.nombre || ''
      };
    } else {
      nuevosMetodos[index] = {
        ...nuevosMetodos[index],
        [campo]: campo === 'monto' ? parseFloat(valor) || 0 : valor
      };
    }

    setMetodos(nuevosMetodos);
  };

  const totalPagado = metodos.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
  const saldoPendiente = totalAPagar - totalPagado;
  const pagoCompleto = Math.abs(saldoPendiente) < 1; // Tolerancia de 1 peso

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const completarPago = (index) => {
    const nuevosMetodos = [...metodos];
    const montosAnteriores = nuevosMetodos.slice(0, index).reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
    const montoRestante = totalAPagar - montosAnteriores;

    nuevosMetodos[index] = {
      ...nuevosMetodos[index],
      monto: montoRestante > 0 ? montoRestante : 0
    };

    setMetodos(nuevosMetodos);
  };

  if (loading) {
    return <div className="metodos-pago-loading">Cargando métodos de pago...</div>;
  }

  return (
    <div className="seleccion-metodos-pago">
      <div className="metodos-pago-header">
        <div className="header-info">
          <CreditCard size={20} />
          <h3>Métodos de Pago</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={agregarMetodo}
          icon={<Plus size={16} />}
        >
          Agregar Método
        </Button>
      </div>

      {metodos.length === 0 ? (
        <div className="metodos-empty">
          <p>No hay métodos de pago agregados</p>
          <Button variant="primary" onClick={agregarMetodo}>
            Agregar Primer Método
          </Button>
        </div>
      ) : (
        <div className="metodos-lista">
          {metodos.map((metodo, index) => {
            const metodoPagoInfo = metodosPagoDisponibles.find(m => m.id === metodo.metodo_pago_id);
            const requiereReferencia = metodoPagoInfo?.requiere_referencia || false;

            return (
              <div key={index} className="metodo-item">
                <div className="metodo-numero">#{index + 1}</div>

                <div className="metodo-campos">
                  <div className="campo-metodo">
                    <label>Método de Pago</label>
                    <div className="metodo-select-wrapper">
                      {metodoPagoInfo && (
                        <span className="metodo-icon">
                          {getPaymentIcon(metodoPagoInfo)}
                        </span>
                      )}
                      <select
                        value={metodo.metodo_pago_id || ''}
                        onChange={(e) => actualizarMetodo(index, 'metodo_pago_id', e.target.value)}
                        className="metodo-select"
                      >
                        <option value="">Seleccionar...</option>
                        {metodosPagoDisponibles.map(mp => (
                          <option key={mp.id} value={mp.id}>
                            {mp.nombre} ({mp.tipo})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="campo-monto">
                    <label>Monto</label>
                    <div className="monto-input-group">
                      <Input
                        type="number"
                        value={metodo.monto || ''}
                        onChange={(e) => actualizarMetodo(index, 'monto', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                      <button
                        type="button"
                        className="btn-completar"
                        onClick={() => completarPago(index)}
                        title="Completar con saldo pendiente"
                      >
                        <DollarSign size={16} />
                      </button>
                    </div>
                  </div>

                  {requiereReferencia && (
                    <div className="campo-referencia">
                      <label>Referencia/Número</label>
                      <Input
                        type="text"
                        value={metodo.referencia || ''}
                        onChange={(e) => actualizarMetodo(index, 'referencia', e.target.value)}
                        placeholder="Ej: 1234"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-eliminar-metodo"
                  onClick={() => eliminarMetodo(index)}
                  title="Eliminar método"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="metodos-resumen">
        <div className="resumen-item">
          <span className="resumen-label">Total a Pagar:</span>
          <span className="resumen-valor resumen-total">{formatPrice(totalAPagar)}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Total Pagado:</span>
          <span className="resumen-valor">{formatPrice(totalPagado)}</span>
        </div>
        <div className={`resumen-item ${pagoCompleto ? 'resumen-completo' : saldoPendiente < 0 ? 'resumen-exceso' : 'resumen-pendiente'}`}>
          <span className="resumen-label">
            {saldoPendiente > 0 ? 'Saldo Pendiente:' : saldoPendiente < 0 ? 'Exceso:' : 'Estado:'}
          </span>
          <span className="resumen-valor resumen-saldo">
            {pagoCompleto ? '✓ COMPLETO' : formatPrice(Math.abs(saldoPendiente))}
          </span>
        </div>
      </div>

      {!pagoCompleto && (
        <div className="metodos-advertencia">
          {saldoPendiente > 0 ? (
            <p>⚠️ Falta {formatPrice(saldoPendiente)} por cubrir</p>
          ) : (
            <p>⚠️ Hay un exceso de {formatPrice(Math.abs(saldoPendiente))}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SeleccionMetodosPago;
