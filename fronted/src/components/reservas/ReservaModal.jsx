import { useState, useEffect } from 'react';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { CREAR_RESERVA } from '../../graphql/reservas';
import { GET_CLIENTES, CREAR_CLIENTE, CREAR_HUESPED, GET_HUESPED_POR_DOCUMENTO } from '../../graphql/huespedes';
import { GET_HABITACIONES } from '../../graphql/habitaciones';
import { GET_MUNICIPIOS_DANE } from '../../graphql/municipios';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Select from '../shared/Select';
import SuccessModal from '../shared/SuccessModal';
import { User, Search, X, Plus, DollarSign, FileText } from 'lucide-react';
import './ReservaModal.css';

function ReservaModal({ isOpen, onClose, selectionData = [], onSuccess }) {
  const navigate = useNavigate();

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Información de reserva
    num_adultos: 2,
    num_ninos: 0,
    estado: 'pendiente',
    canal_reserva: 'directo',

    // Para reserva manual (sin calendario)
    habitacion_id_manual: '',
    fecha_entrada_manual: '',
    fecha_salida_manual: '',

    // Cliente/Huésped
    cliente_id: null,
    cliente: null,
    busqueda_cliente: '',

    // Nuevo cliente
    nuevo_cliente: false,
    cliente_nuevo: {
      tipo_documento: 'CC',
      numero_documento: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigo_municipio: null,
      pais: 'Colombia'
    },

    // Procedencia y destino
    procedencia: 'Colombia',
    destino: 'Colombia',
    motivo_viaje: '',

    // Tarifas y cálculos
    precio_base_modificado: false,
    descuento_porcentaje: 0,
    descuento_monto: 0,
    impuesto_porcentaje: 0,
    impuesto_monto: 0,
    anticipo: 0,

    // Notas
    observaciones: '',
    notas_especiales: ''
  });

  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [preciosPorHabitacion, setPreciosPorHabitacion] = useState({});
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [busquedaMunicipio, setBusquedaMunicipio] = useState('');
  const [mostrarMunicipios, setMostrarMunicipios] = useState(false);

  // Modo manual: cuando no hay selectionData del calendario
  const modoManual = !selectionData || selectionData.length === 0;

  // Lazy query para búsqueda de clientes
  const [buscarClientes, { data: clientesData }] = useLazyQuery(GET_CLIENTES);

  // Lazy query para buscar huésped por documento
  const [buscarHuespedPorDocumento] = useLazyQuery(GET_HUESPED_POR_DOCUMENTO);

  // Query para obtener TODAS las habitaciones (en modo manual)
  // El backend valida conflictos de fechas al crear la reserva
  const { data: habitacionesData } = useQuery(GET_HABITACIONES, {
    skip: !modoManual // Solo cargar si está en modo manual
  });

  // SIMPLIFICADO Sprint 2: Query de municipios DANE deshabilitada
  const { data: municipiosData, loading: loadingMunicipios } = useQuery(GET_MUNICIPIOS_DANE, { skip: true });
  const municipios = municipiosData?.municipiosDane || [];

  const habitacionesDisponibles = habitacionesData?.habitaciones || [];

  // Mutations
  const [crearCliente, { loading: creandoCliente }] = useMutation(CREAR_CLIENTE);
  const [crearHuesped] = useMutation(CREAR_HUESPED);
  const [crearReserva, { loading: creandoReserva }] = useMutation(CREAR_RESERVA, {
    onCompleted: (data) => {
      setSuccessModal({ isOpen: true, message: 'Reserva(s) creada(s) exitosamente' });
    },
    onError: (error) => {
      setErrorModal({ isOpen: true, message: `Error al crear reserva: ${error.message}` });
    }
  });

  // Inicializar precios de habitaciones desde selectionData
  useEffect(() => {
    if (selectionData && selectionData.length > 0) {
      const precios = {};
      selectionData.forEach(reserva => {
        if (!precios[reserva.habitacion_id]) {
          precios[reserva.habitacion_id] = reserva.habitacion.precio_noche;
        }
      });
      setPreciosPorHabitacion(precios);
    }
  }, [selectionData]);

  // Buscar clientes cuando cambia el texto de búsqueda
  useEffect(() => {
    if (formData.cliente_id) {
      // Si ya hay un cliente seleccionado, no buscar ni mostrar sugerencias
      setMostrarSugerencias(false);
      return;
    }
    if (formData.busqueda_cliente.length >= 2) {
      buscarClientes({
        variables: { busqueda: formData.busqueda_cliente, activo: true }
      });
      setMostrarSugerencias(true);
    } else {
      setMostrarSugerencias(false);
    }
  }, [formData.busqueda_cliente, formData.cliente_id, buscarClientes]);

  // Actualizar sugerencias cuando llegan datos
  useEffect(() => {
    if (clientesData?.clientes) {
      setClientesSugeridos(clientesData.clientes);
    }
  }, [clientesData]);

  // Calcular totales
  const calcularTotales = () => {
    let subtotal = 0;

    selectionData.forEach(reserva => {
      const precioNoche = preciosPorHabitacion[reserva.habitacion_id] || reserva.habitacion.precio_noche;
      subtotal += precioNoche * reserva.noches;
    });

    // Descuento
    let descuento = 0;
    if (formData.descuento_porcentaje > 0) {
      descuento = (subtotal * formData.descuento_porcentaje) / 100;
    } else if (formData.descuento_monto > 0) {
      descuento = formData.descuento_monto;
    }

    const subtotalConDescuento = subtotal - descuento;

    // Impuestos
    let impuesto = 0;
    if (formData.impuesto_porcentaje > 0) {
      impuesto = (subtotalConDescuento * formData.impuesto_porcentaje) / 100;
    } else if (formData.impuesto_monto > 0) {
      impuesto = formData.impuesto_monto;
    }

    const total = subtotalConDescuento + impuesto;
    const saldo = total - (parseFloat(formData.anticipo) || 0);

    return { subtotal, descuento, impuesto, total, saldo };
  };

  const totales = calcularTotales();

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNuevoClienteChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      cliente_nuevo: {
        ...formData.cliente_nuevo,
        [name]: value
      }
    });
  };

  const handleSeleccionarCliente = (cliente) => {
    setFormData({
      ...formData,
      cliente_id: cliente.id,
      cliente,
      busqueda_cliente: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      nuevo_cliente: false
    });
    setMostrarSugerencias(false);
  };

  const handleLimpiarCliente = () => {
    setFormData({
      ...formData,
      cliente_id: null,
      cliente: null,
      busqueda_cliente: ''
    });
  };

  const handlePrecioHabitacionChange = (habitacionId, nuevoPrecio) => {
    setPreciosPorHabitacion({
      ...preciosPorHabitacion,
      [habitacionId]: parseFloat(nuevoPrecio) || 0
    });
    setFormData({ ...formData, precio_base_modificado: true });
  };

  const handleDescuentoChange = (tipo, valor) => {
    if (tipo === 'porcentaje') {
      setFormData({
        ...formData,
        descuento_porcentaje: parseFloat(valor) || 0,
        descuento_monto: 0
      });
    } else {
      setFormData({
        ...formData,
        descuento_monto: parseFloat(valor) || 0,
        descuento_porcentaje: 0
      });
    }
  };

  const handleImpuestoChange = (tipo, valor) => {
    if (tipo === 'porcentaje') {
      setFormData({
        ...formData,
        impuesto_porcentaje: parseFloat(valor) || 0,
        impuesto_monto: 0
      });
    } else {
      setFormData({
        ...formData,
        impuesto_monto: parseFloat(valor) || 0,
        impuesto_porcentaje: 0
      });
    }
  };

  // Filtrar municipios según búsqueda
  const municipiosFiltrados = municipios.filter((mun) => {
    if (!busquedaMunicipio) return false;
    const searchLower = busquedaMunicipio.toLowerCase();
    return (
      mun.nombre.toLowerCase().includes(searchLower) ||
      mun.departamento.toLowerCase().includes(searchLower) ||
      mun.codigo.includes(searchLower)
    );
  });

  // Obtener municipio seleccionado
  const municipioSeleccionado = municipios.find(
    m => m.codigo === formData.cliente_nuevo.codigo_municipio
  );

  // Handler de selección de municipio
  const handleSeleccionarMunicipio = (municipio) => {
    setFormData(prev => ({
      ...prev,
      cliente_nuevo: {
        ...prev.cliente_nuevo,
        codigo_municipio: municipio.codigo
      }
    }));
    setMostrarMunicipios(false);
    setBusquedaMunicipio('');
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.cliente_id && !formData.nuevo_cliente) {
      setErrorModal({ isOpen: true, message: 'Por favor selecciona o crea un cliente' });
      return;
    }

    if (formData.nuevo_cliente && (!formData.cliente_nuevo.nombre || !formData.cliente_nuevo.numero_documento)) {
      setErrorModal({ isOpen: true, message: 'Por favor completa los datos del nuevo cliente' });
      return;
    }

    // Validar modo manual
    if (modoManual) {
      if (!formData.habitacion_id_manual || !formData.fecha_entrada_manual || !formData.fecha_salida_manual) {
        setErrorModal({ isOpen: true, message: 'Por favor completa todos los campos de la reserva' });
        return;
      }
    } else {
      if (selectionData.length === 0) {
        setErrorModal({ isOpen: true, message: 'No hay habitaciones seleccionadas' });
        return;
      }
    }

    /* SIMPLIFICADO Sprint 2: Validación de municipio DANE deshabilitada */
    // if (formData.nuevo_cliente && !formData.cliente_nuevo.codigo_municipio) {
    //   setErrorModal({ isOpen: true, message: 'El municipio DANE es obligatorio para crear un cliente' });
    //   return;
    // }

    try {
      let clienteId = parseInt(formData.cliente_id);

      // Crear nuevo cliente si es necesario
      if (formData.nuevo_cliente) {
        const { data } = await crearCliente({
          variables: { input: formData.cliente_nuevo }
        });
        clienteId = parseInt(data.crearCliente.id);
      }

      // Verificar si ya existe un huésped con este documento
      const numeroDocumento = formData.nuevo_cliente
        ? formData.cliente_nuevo.numero_documento
        : formData.cliente.numero_documento;

      let huespedId;

      // Primero buscar si ya existe el huésped
      try {
        const { data: huespedExistente } = await buscarHuespedPorDocumento({
          variables: { numero_documento: numeroDocumento }
        });

        if (huespedExistente?.huespedPorDocumento) {
          // Si el huésped ya existe, usar su ID
          huespedId = parseInt(huespedExistente.huespedPorDocumento.id);
          console.log('Huésped existente encontrado, usando ID:', huespedId);
        }
      } catch (busquedaError) {
        console.log('No se encontró huésped existente, se creará uno nuevo');
      }

      // Si no existe, crear nuevo huésped
      if (!huespedId) {
        const huespedInput = {
          cliente_id: parseInt(clienteId),
          nombre: formData.nuevo_cliente ? formData.cliente_nuevo.nombre : formData.cliente.nombre,
          apellido: formData.nuevo_cliente ? (formData.cliente_nuevo.apellido || null) : (formData.cliente.apellido || null),
          tipo_documento: formData.nuevo_cliente ? formData.cliente_nuevo.tipo_documento : formData.cliente.tipo_documento,
          numero_documento: numeroDocumento,
          telefono: formData.nuevo_cliente ? formData.cliente_nuevo.telefono : formData.cliente.telefono,
          email: formData.nuevo_cliente ? formData.cliente_nuevo.email : formData.cliente.email,
          direccion: formData.nuevo_cliente ? formData.cliente_nuevo.direccion : formData.cliente.direccion,
          ciudad: formData.nuevo_cliente ? formData.cliente_nuevo.ciudad : formData.cliente.ciudad,
          pais: formData.nuevo_cliente ? formData.cliente_nuevo.pais : formData.cliente.pais,
          observaciones: formData.notas_especiales || null,
        };

        try {
          const { data: huespedData } = await crearHuesped({
            variables: { input: huespedInput }
          });

          if (huespedData?.crearHuesped?.id) {
            huespedId = parseInt(huespedData.crearHuesped.id);
            console.log('Nuevo huésped creado con ID:', huespedId);
          }
        } catch (crearError) {
          // Si falla porque ya existe, intentar buscar de nuevo
          if (crearError.message.includes('Ya existe un huésped')) {
            console.log('El huésped ya existe, buscándolo de nuevo...');
            const { data: huespedExistente } = await buscarHuespedPorDocumento({
              variables: { numero_documento: numeroDocumento }
            });
            if (huespedExistente?.huespedPorDocumento) {
              huespedId = parseInt(huespedExistente.huespedPorDocumento.id);
              console.log('Huésped encontrado después de error, usando ID:', huespedId);
            } else {
              throw new Error('No se pudo encontrar ni crear el huésped');
            }
          } else {
            throw crearError;
          }
        }
      }

      if (!huespedId) {
        throw new Error('No se pudo obtener el ID del huésped');
      }

      // Modo manual: crear una sola reserva
      if (modoManual) {
        await crearReserva({
          variables: {
            input: {
              habitacion_id: parseInt(formData.habitacion_id_manual),
              huesped_id: parseInt(huespedId),
              fecha_entrada: formData.fecha_entrada_manual,
              fecha_salida: formData.fecha_salida_manual,
              num_adultos: formData.num_adultos,
              num_ninos: formData.num_ninos,
              canal: formData.canal_reserva,
              observaciones: formData.observaciones || undefined,
              anticipo: parseFloat(formData.anticipo) || 0
            }
          }
        });
      } else {
        // Modo calendario: crear múltiples reservas
        const anticipoTotal = parseFloat(formData.anticipo) || 0;
        const totalSubtotal = selectionData.reduce((sum, reserva) => {
          const precioNoche = preciosPorHabitacion[reserva.habitacion_id] || reserva.habitacion.precio_noche;
          return sum + (precioNoche * reserva.noches);
        }, 0);

        // Crear reservas para cada habitación seleccionada
        const promesas = selectionData.map(reserva => {
          const precioNoche = preciosPorHabitacion[reserva.habitacion_id] || reserva.habitacion.precio_noche;
          const subtotalHabitacion = precioNoche * reserva.noches;

          // Anticipo proporcional
          const anticipoProporcional = totalSubtotal > 0
            ? (subtotalHabitacion / totalSubtotal) * anticipoTotal
            : 0;

          return crearReserva({
            variables: {
              input: {
                habitacion_id: reserva.habitacion_id,
                huesped_id: parseInt(huespedId),
                fecha_entrada: reserva.fecha_entrada,
                fecha_salida: reserva.fecha_salida,
                num_adultos: formData.num_adultos,
                num_ninos: formData.num_ninos,
                canal: formData.canal_reserva,
                precio_noche: precioNoche,
                observaciones: formData.observaciones || undefined,
                anticipo: Math.round(anticipoProporcional)
              }
            }
          });
        });

        await Promise.all(promesas);
      }
    } catch (error) {
      console.error('Error al crear reserva(s):', error);
      setErrorModal({ isOpen: true, message: `Error al crear reserva(s): ${error.message}` });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modoManual ? 'Nueva Reserva Manual' : `Nueva Reserva - ${selectionData.length} ${selectionData.length === 1 ? 'Habitación' : 'Habitaciones'}`}
      size="large"
    >
      <div className="reserva-modal-nuevo">
        {/* BLOQUE 1: Información de Reserva */}
        <div className="bloque-reserva">
          <h3 className="bloque-title">
            <FileText size={18} />
            Información de Reserva
          </h3>

          {/* Modo Manual: Seleccionar habitación y fechas */}
          {modoManual ? (
            <div className="form-row">
              <Select
                label="Habitación *"
                name="habitacion_id_manual"
                value={formData.habitacion_id_manual}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Seleccionar habitación...' },
                  ...habitacionesDisponibles.map(hab => ({
                    value: hab.id.toString(),
                    label: `Hab. ${hab.numero} - ${hab.tipo} ($${hab.precio_noche.toLocaleString('es-CO')}/noche)`
                  }))
                ]}
                required
              />
              <Input
                type="date"
                label="Fecha Entrada *"
                name="fecha_entrada_manual"
                value={formData.fecha_entrada_manual}
                onChange={handleInputChange}
                required
              />
              <Input
                type="date"
                label="Fecha Salida *"
                name="fecha_salida_manual"
                value={formData.fecha_salida_manual}
                onChange={handleInputChange}
                required
              />
            </div>
          ) : (
            /* Modo Calendario: Mostrar selección */
            <div className="habitaciones-seleccionadas">
              {selectionData.map((reserva, index) => (
                <div key={index} className="habitacion-item">
                  <div className="hab-info">
                    <span className="hab-numero">Hab. {reserva.habitacion.numero}</span>
                    <span className="hab-tipo">{reserva.habitacion.tipo}</span>
                  </div>
                  <div className="hab-fechas">
                    <span>{formatDate(reserva.fecha_entrada)} → {formatDate(reserva.fecha_salida)}</span>
                    <span className="hab-noches">({reserva.noches} {reserva.noches === 1 ? 'noche' : 'noches'})</span>
                  </div>
                  <div className="hab-precio">
                    <Input
                      type="number"
                      value={preciosPorHabitacion[reserva.habitacion_id] || reserva.habitacion.precio_noche}
                      onChange={(e) => handlePrecioHabitacionChange(reserva.habitacion_id, e.target.value)}
                      min="0"
                      step="1000"
                    />
                    <span className="precio-label">/noche</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="form-row">
            <Input
              type="number"
              label="Adultos"
              name="num_adultos"
              value={formData.num_adultos}
              onChange={handleInputChange}
              min="1"
              required
            />

            <Input
              type="number"
              label="Niños"
              name="num_ninos"
              value={formData.num_ninos}
              onChange={handleInputChange}
              min="0"
            />

            <Select
              label="Estado"
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'confirmada', label: 'Confirmada' }
              ]}
            />

            {/* SIMPLIFICADO Sprint 2: Canal de reserva ocultado */}
            {/* <Select
              label="Canal"
              name="canal_reserva"
              value={formData.canal_reserva}
              onChange={handleInputChange}
              options={[
                { value: 'directo', label: 'Directo' },
                { value: 'telefono', label: 'Teléfono' },
                { value: 'web', label: 'Web' },
                { value: 'booking', label: 'Booking.com' },
                { value: 'airbnb', label: 'Airbnb' },
                { value: 'expedia', label: 'Expedia' },
                { value: 'walk_in', label: 'Walk-in' }
              ]}
            /> */}
          </div>
        </div>

        {/* BLOQUE 2: Información del Titular */}
        <div className="bloque-titular">
          <h3 className="bloque-title">
            <User size={18} />
            Información del Titular
          </h3>

          <div className="cliente-toggle">
            <Button
              variant={!formData.nuevo_cliente ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, nuevo_cliente: false })}
            >
              Cliente Existente
            </Button>
            <Button
              variant={formData.nuevo_cliente ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, nuevo_cliente: true, cliente_id: null, cliente: null })}
            >
              <Plus size={16} />
              Nuevo Cliente
            </Button>
          </div>

          {!formData.nuevo_cliente ? (
            <div className="busqueda-cliente">
              <div className="busqueda-input-wrapper">
                <Search className="busqueda-icon" size={18} />
                <input
                  type="text"
                  className="busqueda-input"
                  placeholder="Buscar por nombre, documento, teléfono o email..."
                  value={formData.busqueda_cliente}
                  onChange={(e) => setFormData({ ...formData, busqueda_cliente: e.target.value })}
                  onFocus={() => formData.busqueda_cliente.length >= 2 && setMostrarSugerencias(true)}
                />
                {formData.cliente_id && (
                  <button className="busqueda-clear" onClick={handleLimpiarCliente}>
                    <X size={18} />
                  </button>
                )}
              </div>

              {mostrarSugerencias && clientesSugeridos.length > 0 && (
                <div className="sugerencias-dropdown">
                  {clientesSugeridos.map(cliente => (
                    <div
                      key={cliente.id}
                      className="sugerencia-item"
                      onClick={() => handleSeleccionarCliente(cliente)}
                    >
                      <div className="sugerencia-nombre">
                        {cliente.nombre} {cliente.apellido}
                      </div>
                      <div className="sugerencia-detalles">
                        <span>{cliente.tipo_documento}: {cliente.numero_documento}</span>
                        {cliente.telefono && <span>Tel: {cliente.telefono}</span>}
                        {cliente.email && <span>{cliente.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.cliente && (
                <div className="cliente-seleccionado">
                  <div className="cliente-sel-header">
                    <strong>{formData.cliente.nombre} {formData.cliente.apellido}</strong>
                    <span className="cliente-sel-doc">{formData.cliente.tipo_documento}: {formData.cliente.numero_documento}</span>
                  </div>
                  {formData.cliente.telefono && <div>Tel: {formData.cliente.telefono}</div>}
                  {formData.cliente.email && <div>Email: {formData.cliente.email}</div>}
                  {formData.cliente.direccion && <div>Dir: {formData.cliente.direccion}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="form-nuevo-cliente">
              <div className="form-row">
                <Select
                  label="Tipo de Documento"
                  name="tipo_documento"
                  value={formData.cliente_nuevo.tipo_documento}
                  onChange={handleNuevoClienteChange}
                  options={[
                    { value: 'CC', label: 'Cédula de Ciudadanía' },
                    { value: 'CE', label: 'Cédula de Extranjería' },
                    { value: 'PA', label: 'Pasaporte' },
                    { value: 'TI', label: 'Tarjeta de Identidad' },
                    { value: 'NIT', label: 'NIT' }
                  ]}
                />

                <Input
                  label="Número de Documento *"
                  name="numero_documento"
                  value={formData.cliente_nuevo.numero_documento}
                  onChange={handleNuevoClienteChange}
                  required
                />
              </div>

              <div className="form-row">
                <Input
                  label="Nombre *"
                  name="nombre"
                  value={formData.cliente_nuevo.nombre}
                  onChange={handleNuevoClienteChange}
                  required
                />

                <Input
                  label="Apellido"
                  name="apellido"
                  value={formData.cliente_nuevo.apellido}
                  onChange={handleNuevoClienteChange}
                />
              </div>

              <div className="form-row">
                <Input
                  type="email"
                  label="Email"
                  name="email"
                  value={formData.cliente_nuevo.email}
                  onChange={handleNuevoClienteChange}
                />

                <Input
                  type="tel"
                  label="Teléfono"
                  name="telefono"
                  value={formData.cliente_nuevo.telefono}
                  onChange={handleNuevoClienteChange}
                />
              </div>

              <Input
                label="Dirección"
                name="direccion"
                value={formData.cliente_nuevo.direccion}
                onChange={handleNuevoClienteChange}
              />

              <div className="form-row">
                <Input
                  label="Ciudad"
                  name="ciudad"
                  value={formData.cliente_nuevo.ciudad}
                  onChange={handleNuevoClienteChange}
                />

                <Input
                  label="País"
                  name="pais"
                  value={formData.cliente_nuevo.pais}
                  onChange={handleNuevoClienteChange}
                />
              </div>

              {/* SIMPLIFICADO Sprint 2: Selector de Municipio DANE ocultado */}
              {/* <div className="form-group" style={{marginBottom: '1rem'}}>
                <label htmlFor="municipio-reserva">Municipio (Código DANE) <span style={{color: 'red'}}>*</span></label>
                ... selector de municipios DANE ...
              </div> */}
            </div>
          )}
        </div>

        {/* SIMPLIFICADO Sprint 2: Bloque de Procedencia y Destino ocultado */}
        {/* <div className="bloque-procedencia">
          <h3 className="bloque-title">
            <MapPin size={18} />
            Procedencia y Destino
          </h3>
          <div className="form-row">
            <Input label="Procedencia" name="procedencia" value={formData.procedencia} onChange={handleInputChange} placeholder="Colombia" />
            <Input label="Destino" name="destino" value={formData.destino} onChange={handleInputChange} placeholder="Colombia" />
            <Input label="Motivo de Viaje" name="motivo_viaje" value={formData.motivo_viaje} onChange={handleInputChange} placeholder="Turismo, Negocios, etc." />
          </div>
        </div> */}

        {/* BLOQUE 4: Tarifas y Cálculos */}
        <div className="bloque-tarifas">
          <h3 className="bloque-title">
            <DollarSign size={18} />
            Tarifas y Cálculos
          </h3>

          <div className="calculo-grid">
            <div className="calculo-item">
              <span className="calculo-label">Subtotal:</span>
              <span className="calculo-value">{formatPrice(totales.subtotal)}</span>
            </div>

            {/* SIMPLIFICADO Sprint 2: Descuento e impuesto ocultados */}
            {/* <div className="form-row descuento-row">
              <Input type="number" label="Descuento %" value={formData.descuento_porcentaje} onChange={(e) => handleDescuentoChange('porcentaje', e.target.value)} min="0" max="100" step="0.1" />
              <span className="separator">o</span>
              <Input type="number" label="Descuento $" value={formData.descuento_monto} onChange={(e) => handleDescuentoChange('monto', e.target.value)} min="0" />
            </div>
            {totales.descuento > 0 && (
              <div className="calculo-item descuento">
                <span className="calculo-label">Descuento:</span>
                <span className="calculo-value">-{formatPrice(totales.descuento)}</span>
              </div>
            )}
            <div className="form-row impuesto-row">
              <Input type="number" label="Impuesto %" value={formData.impuesto_porcentaje} onChange={(e) => handleImpuestoChange('porcentaje', e.target.value)} min="0" max="100" step="0.1" />
              <span className="separator">o</span>
              <Input type="number" label="Impuesto $" value={formData.impuesto_monto} onChange={(e) => handleImpuestoChange('monto', e.target.value)} min="0" />
            </div>
            {totales.impuesto > 0 && (
              <div className="calculo-item impuesto">
                <span className="calculo-label">Impuestos:</span>
                <span className="calculo-value">+{formatPrice(totales.impuesto)}</span>
              </div>
            )} */}

            <div className="calculo-item total">
              <span className="calculo-label">Total:</span>
              <span className="calculo-value">{formatPrice(totales.total)}</span>
            </div>

            <Input
              type="number"
              label="Anticipo"
              name="anticipo"
              value={formData.anticipo}
              onChange={handleInputChange}
              min="0"
              max={totales.total}
            />

            <div className="calculo-item saldo">
              <span className="calculo-label">Saldo Pendiente:</span>
              <span className="calculo-value">{formatPrice(totales.saldo)}</span>
            </div>
          </div>
        </div>

        {/* BLOQUE 5: Notas */}
        <div className="bloque-notas">
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Observaciones</label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows="3"
                className="textarea"
                placeholder="Observaciones generales..."
              />
            </div>

            <div className="input-group">
              <label className="input-label">Notas Especiales</label>
              <textarea
                name="notas_especiales"
                value={formData.notas_especiales}
                onChange={handleInputChange}
                rows="3"
                className="textarea"
                placeholder="Preferencias del huésped, solicitudes especiales..."
              />
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="modal-footer">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={creandoReserva || creandoCliente}
          >
            {creandoReserva || creandoCliente
              ? 'Creando...'
              : modoManual
                ? 'Crear Reserva'
                : `Crear ${selectionData.length} Reserva${selectionData.length > 1 ? 's' : ''}`
            }
          </Button>
        </div>
      </div>

      {/* Modales de éxito y error */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => {
          setSuccessModal({ isOpen: false, message: '' });
          if (onSuccess) {
            onSuccess();
          } else {
            onClose();
            window.location.reload();
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
    </Modal>
  );
}

export default ReservaModal;