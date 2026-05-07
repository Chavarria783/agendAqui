const { gql } = require('graphql-tag');

// Fix: Factura/FacturaElectronica sync - 2024-12-15
const typeDefs = gql`
  # ============================================================================
  # SCALAR TYPES
  # ============================================================================
  scalar JSON
  scalar DateTime
  scalar Date

  # ============================================================================
  # ENUMS
  # ============================================================================
  enum EstadoHabitacion {
    disponible
    ocupada
    limpieza
    mantenimiento
    reservada
  }

  enum TipoHabitacion {
    simple
    doble
    suite
    familiar
    presidencial
  }

  enum EstadoReserva {
    pendiente
    confirmada
    cancelada
    en_curso
    finalizada
    no_show
  }

  enum EstadoHospedaje {
    activo
    finalizado
    cancelado
  }

  enum CanalReserva {
    directo
    booking
    airbnb
    expedia
    telefono
    web
    walk_in
  }

  enum CategoriaServicio {
    lavanderia
    transporte
    spa
    room_service
    bar
    restaurante
    tours
    otro
  }

  enum TipoDocumento {
    CC
    CE
    TI
    NIT
    Pasaporte
    Otro
  }

  enum RolUsuario {
    superadmin
    admin
    recepcionista
    limpieza
    mantenimiento
    gerente
  }

  # ============================================================================
  # ENUMS SISTEMA POS
  # ============================================================================
  enum TipoDescuento {
    porcentaje
    monto_fijo
  }

  enum TipoCliente {
    consumidor_final
    cliente_registrado
    huesped
  }

  enum EstadoPagoVenta {
    pagado
    cuenta_huesped
    pendiente
    anulado
  }

  enum TipoMovimientoCaja {
    ingreso
    egreso
  }

  enum ConceptoMovimientoCaja {
    venta
    retiro
    fondo_inicial
    reembolso
    ajuste
    otro
  }

  enum EstadoTurnoCaja {
    abierto
    cerrado
  }

  # ============================================================================
  # TIPOS DE DOCUMENTO DIAN (Resolución 000042 de 2020)
  # ============================================================================

  type TipoDocumentoDian {
    codigo_dian: Int!
    codigo_interno: String!
    descripcion: String!
    requiere_digito_verificacion: Boolean!
    patron_validacion: String
    longitud_minima: Int
    longitud_maxima: Int
    activo: Boolean!
    created_at: DateTime
    updated_at: DateTime
  }

  # ============================================================================
  # MUNICIPIOS DANE (Código DIVIPOLA)
  # ============================================================================

  type MunicipioDane {
    codigo: String!              # Código DANE completo de 5 dígitos (ej: "05001")
    nombre: String!              # Nombre del municipio (ej: "MEDELLÍN")
    departamento: String!        # Nombre del departamento (ej: "ANTIOQUIA")
    codigoDepartamento: String!  # Código del departamento de 2 dígitos (ej: "05")
    region: String               # Región geográfica (ej: "REGIÓN ANDINA")
  }

  # ============================================================================
  # FACTURACIÓN ELECTRÓNICA - FACTUS
  # ============================================================================

  type ConfiguracionFactus {
    id: Int!
    endpoint: String!
    email: String!
    client_id: String!
    ambiente: String!
    email_facturacion: String
    activo: Boolean!
    iva_hospedaje: Float!
    iva_consumos: Float!
    iva_servicios: Float!
    access_token: String
    token_expiry: DateTime
    created_at: DateTime!
    updated_at: DateTime!
  }

  type FacturaElectronica {
    id: Int!
    factura_id: Int!
    factus_id: Int
    cufe: String
    numero_factura_dian: String
    numero_factus: String
    prefijo: String
    url_pdf: String
    url_xml: String
    estado_dian: String
    fecha_envio: DateTime
    fecha_respuesta_dian: DateTime
    errores_validacion: JSON
    datos_cliente_snapshot: JSON
    datos_factura_snapshot: JSON
    respuesta_factus: JSON
    created_at: DateTime!
    updated_at: DateTime!
    factura: Factura
  }

  type FactusNumberingRange {
    id: Int!
    document: String
    prefix: String
    from: Int
    to: Int
    current: Int
    resolution_number: String
    is_expired: Boolean
  }

  type NotaCredito {
    id: Int!
    factura_electronica_id: Int!
    factus_id: Int
    cufe: String
    numero_nota_credito: String
    motivo: String!
    url_pdf: String
    url_xml: String
    estado_dian: String
    valor_total: Float!
    items: JSON!
    fecha_envio: DateTime
    fecha_respuesta_dian: DateTime
    respuesta_factus: JSON
    created_at: DateTime!
    updated_at: DateTime!
    factura_electronica: FacturaElectronica
  }

  # ============================================================================
  # FACTUBOX - LISTADO Y GESTIÓN DE FACTURAS ELECTRÓNICAS
  # ============================================================================

  type FacturaElectronicaResumen {
    id: Int!
    factura_id: Int!
    prefijo_factura: String
    numero_secuencial: Int
    numero_factura_dian: String
    numero_factura_interna: String!
    cliente_nombre: String!
    cliente_documento: String!
    fecha_factura: DateTime!
    total: Float!
    cufe: String
    estado_dian: String!
    fecha_envio: DateTime
    url_pdf: String
    url_xml: String
  }

  type ListadoFacturasElectronicas {
    facturas: [FacturaElectronicaResumen!]!
    total: Int!
  }

  type NotaCreditoResumen {
    id: Int!
    factura_electronica_id: Int!
    numero_nota_dian: String!
    cliente_nombre: String!
    fecha_emision: DateTime!
    valor: Float!
    motivo: String!
    estado_dian: String!
    cufe: String
    url_pdf: String
    url_xml: String
  }

  type ListadoNotasCredito {
    notas: [NotaCreditoResumen!]!
    total: Int!
  }

  type RespuestaTransmision {
    success: Boolean!
    message: String!
    cufe: String
    numero_dian: String
    estado_dian: String
    url_pdf: String
    url_xml: String
    errores: [String!]
  }

  type RespuestaReimpresion {
    success: Boolean!
    message: String!
    url_pdf: String
    url_xml: String
    numero_factura: String
    cufe: String
  }

  type FacturaElectronicaCompleta {
    id: Int!
    factura_id: Int!
    numero_factura_electronica: String
    numero_factus: String
    numero_factura_display: String
    factura_prefijo: String
    prefijo: String
    numero: Int
    cufe: String
    estado_dian: String
    fecha_emision: String
    fecha_envio: String
    pdf_url: String
    xml_url: String
    qr_url: String
    public_url: String

    # Datos del Emisor
    emisor_nit: String
    emisor_digito_verificacion: String
    emisor_razon_social: String
    emisor_nombre_comercial: String
    emisor_direccion: String
    emisor_telefono: String
    emisor_email: String
    emisor_municipio_dane: String
    emisor_regimen_tributario: String
    emisor_responsabilidades_fiscales: JSON

    # Resolución DIAN
    resolucion_dian: String
    resolucion_prefijo: String
    resolucion_numero_inicio: Int
    resolucion_numero_fin: Int
    resolucion_fecha_inicio: String
    resolucion_fecha_fin: String

    # Logo
    logo_url: String

    # Cliente (snapshot histórico)
    cliente_nombre: String!
    cliente_tipo_documento: String
    cliente_numero_documento: String
    cliente_email: String
    cliente_telefono: String
    cliente_direccion: String
    cliente_ciudad: String
    cliente_codigo_municipio_dane: String
    cliente_digito_verificacion: String

    # Desglose financiero
    subtotal_hospedaje: Float!
    subtotal_consumos: Float!
    subtotal: Float!
    total_impuestos: Float
    total_descuentos: Float
    total: Float!

    # Items (JSON)
    items_hospedaje: JSON
    items_consumos: JSON
    metodos_pago: JSON

    # Relación con factura local
    factura: Factura
  }

  type RespuestaTransmisionLote {
    factura_electronica_id: Int!
    success: Boolean!
    message: String!
    cufe: String
    numero_dian: String
    estado_dian: String
    url_pdf: String
    url_xml: String
    errores: [String]
  }

  # ============================================================================
  # NOTAS DE CRÉDITO - TIPOS PARA FACTUBOX
  # ============================================================================

  # Factura elegible para crear nota de crédito
  type FacturaElegibleNC {
    id: Int!
    factura_id: Int!
    numero_factura_dian: String!
    cliente_nombre: String!
    cliente_documento: String!
    fecha_factura: DateTime!
    total: Float!
    cufe: String!
    factus_id: String
    items_hospedaje: JSON
    items_consumos: JSON
    tiene_nota_credito_total: Boolean!
    total_notas_credito: Float!
  }

  type ListadoFacturasElegiblesNC {
    facturas: [FacturaElegibleNC!]!
    total: Int!
  }

  # Respuesta de transmisión de nota de crédito
  type RespuestaTransmisionNC {
    success: Boolean!
    message: String!
    nota_credito_id: Int
    cufe: String
    numero_nota_dian: String
    estado_dian: String
    url_pdf: String
    url_xml: String
    errores: [String!]
  }

  type ProbarConexionFactusResponse {
    success: Boolean!
    message: String!
    endpoint: String
    ambiente: String
    token_obtenido: Boolean
    expires_in: Int
    error: String
  }

  enum TipoCategoria {
    servicio
    producto
    ambos
  }

  enum TipoItem {
    servicio
    producto
  }

  enum TipoMovimiento {
    entrada
    salida
    ajuste
    devolucion
  }

  # ============================================================================
  # TYPES
  # ============================================================================

  type Usuario {
    id: ID!
    nombre: String!
    apellido: String
    nombre_completo: String
    usuario: String!
    pin: String
    rol: RolUsuario!
    email: String
    telefono: String
    foto_url: String
    activo: Boolean!
    created_at: DateTime
  }

  type Habitacion {
    id: ID!
    numero: String!
    piso: Int!
    tipo: TipoHabitacion!
    capacidad: Int!
    precio_noche: Float!
    descripcion: String
    comodidades: JSON
    estado: EstadoHabitacion!
    activa: Boolean!
    imagen_url: String
    ultima_limpieza: DateTime
    ultima_mantenimiento: DateTime
    notas_mantenimiento: String
    created_at: DateTime
    updated_at: DateTime
  }

  type Cliente {
    id: ID!
    nombre: String!
    apellido: String
    tipo_documento: TipoDocumento           # Legacy (mantener por compatibilidad)
    tipo_documento_dian: Int                # Código numérico DIAN del tipo de documento
    numero_documento: String
    digito_verificacion: String             # Dígito de verificación para NIT
    telefono: String
    email: String
    direccion: String
    ciudad: String
    codigo_municipio: String                # Código DANE del municipio (5 dígitos)
    pais: String
    fecha_nacimiento: Date
    regimen_tributario: String              # Régimen tributario: Común, Simplificado, Grande Contribuyente
    responsable_iva: Boolean                # Indica si el cliente es responsable de IVA
    observaciones: String
    activo: Boolean!
    created_at: DateTime
    huespedes: [Huesped!]                   # Huéspedes asociados a este cliente
  }

  type Huesped {
    id: ID!
    cliente_id: Int!
    tipo_documento: TipoDocumento!
    numero_documento: String!
    nombre_completo: String
    fecha_nacimiento: Date
    nacionalidad: String
    telefono: String
    email: String
    direccion: String
    ciudad: String
    pais: String
    contacto_emergencia: String
    telefono_emergencia: String
    observaciones: String
    preferencias: JSON
    created_at: DateTime
    # Campos TRA (Tarjeta de Registro de Alojamiento)
    lugar_residencia: String
    lugar_procedencia: String
    motivo_viaje: String
  }

  type Reserva {
    id: ID!
    codigo: String!
    habitacion_id: Int!
    huesped_id: Int!
    fecha_entrada: Date!
    fecha_salida: Date!
    noches: Int!
    precio_noche: Float!
    precio_total: Float!
    anticipo: Float
    saldo_pendiente: Float
    estado: EstadoReserva!
    canal_reserva: CanalReserva
    observaciones: String
    notas_especiales: String
    created_by: Int
    confirmed_at: DateTime
    cancelled_at: DateTime
    motivo_cancelacion: String
    created_at: DateTime
    updated_at: DateTime
    habitacion: Habitacion
    huesped: Huesped
  }

  # ============================================================================
  # CALENDARIO UNIFICADO (Reservas + Hospedajes Walk-In)
  # ============================================================================

  type AlertasReservas {
    llegadasHoy: Int!
    enCurso: Int!
    salidasHoy: Int!
    lateCheckouts: Int!
    pendientesSinConfirmar: Int!
  }

  type CalendarioEvento {
    id: ID!
    tipo: String!                    # "reserva" o "hospedaje"
    codigo: String!
    habitacion_id: Int!
    habitacion: Habitacion
    huesped: Huesped
    fecha_entrada: DateTime!
    fecha_salida: Date!
    estado: String!
    es_reserva: Boolean!
    es_walkIn: Boolean!

    # Campos comunes (presentes en ambos tipos)
    noches: Int
    num_adultos: Int
    num_ninos: Int
    precio_noche: Float
    precio_total: Float
    observaciones: String
    notas_especiales: String
    created_at: DateTime

    # Campos específicos de reservas (null si es hospedaje)
    anticipo: Float
    saldo_pendiente: Float
    canal_reserva: String
    confirmed_at: DateTime
    cancelled_at: DateTime
    motivo_cancelacion: String

    # Campos específicos de hospedajes (null si es reserva)
    noches_previstas: Int
    reserva_id: Int
  }

  type Hospedaje {
    id: ID!
    codigo: String!
    reserva_id: Int
    habitacion_id: Int!
    huesped_id: Int!
    acompanantes: JSON
    fecha_entrada: DateTime!
    fecha_salida_prevista: Date!
    fecha_salida_real: DateTime
    noches_previstas: Int!
    noches_reales: Int
    precio_noche: Float!
    precio_total_hospedaje: Float
    estado: EstadoHospedaje!
    observaciones: String
    notas_especiales: String
    forma_pago_anticipo: String
    monto_anticipo: Float
    created_by: Int
    checked_out_at: DateTime
    checked_out_by: Int
    created_at: DateTime
    updated_at: DateTime
    habitacion: Habitacion
    huesped: Huesped
    reserva: Reserva
    # Campos TRA
    tra_estado: String
    costo_alojamiento_tra: Float
  }

  type ServicioHotel {
    id: ID!
    codigo: String
    nombre: String!
    descripcion: String
    categoria: CategoriaServicio!
    precio: Float!
    iva: Float
    precio_con_iva: Float
    unidad: String
    duracion_minutos: Int
    activo: Boolean!
    imagen_url: String
    created_at: DateTime
  }

  type ConsumoHabitacion {
    id: ID!
    hospedaje_id: Int!
    habitacion_id: Int!
    item_inventario_id: Int
    item_nombre: String
    item_tipo: String
    producto_id: Int
    servicio_id: Int
    descripcion: String!
    cantidad: Int!
    precio_unitario: Float!
    precio_total: Float!
    iva: Float
    fecha_consumo: DateTime!
    facturado: Boolean!
    factura_id: Int
    usuario_id: Int
    notas: String
    producto_nombre: String
    servicio_nombre: String
    usuario_registro: String
    created_at: DateTime
  }

  type Producto {
    id: ID!
    codigo: String
    nombre: String!
    descripcion: String
    categoria: String
    precio_venta: Float!
    precio_compra: Float
    stock_actual: Int
    stock_minimo: Int
    unidad_medida: String
    activo: Boolean!
    imagen_url: String
    created_at: DateTime
  }

  type CategoriaInventario {
    id: ID!
    nombre: String!
    descripcion: String
    tipo: TipoCategoria!
    color: String
    icono: String
    orden: Int!
    activa: Boolean!
    created_at: DateTime
    updated_at: DateTime
  }

  type ItemInventario {
    id: ID!
    codigo: String
    nombre: String!
    descripcion: String
    tipo: TipoItem!
    categoria_id: Int!
    categoria: CategoriaInventario
    precio_base: Float!
    iva_porcentaje: Float
    precio_con_iva: Float
    stock_actual: Int
    stock_minimo: Int
    unidad_medida: String
    ubicacion_almacen: String
    duracion_minutos: Int
    precio_compra: Float
    margen_utilidad: Float
    activo: Boolean!
    imagen_url: String
    notas: String
    created_at: DateTime
    updated_at: DateTime
  }

  type MovimientoInventario {
    id: ID!
    item_inventario_id: Int!
    item: ItemInventario
    tipo_movimiento: TipoMovimiento!
    cantidad: Int!
    stock_anterior: Int!
    stock_nuevo: Int!
    consumo_id: Int
    motivo: String!
    usuario_id: Int
    usuario: Usuario
    fecha_movimiento: DateTime!
  }

  type ResumenConsumos {
    total_items: Int!
    total_consumos: Float!
    items_facturados: Int!
    total_facturado: Float!
    items_pendientes: Int!
    total_pendiente: Float!
  }

  type MetodoPago {
    id: ID!
    nombre: String!
    codigo_dian: String
    tipo: String!
    activo: Boolean!
    requiere_referencia: Boolean
    icono: String
    orden: Int
  }

  type Factura {
    id: ID!
    numero: String!
    prefijo: String
    numero_factura_display: String
    fecha: DateTime!
    subtotal: Float!
    impuestos: Float
    descuento: Float
    total: Float!
    cliente_id: Int
    hospedaje_id: Int
    observaciones: String
    usuario_id: Int
    metodos_pago: JSON
    created_at: DateTime
    tiene_factura_electronica: Boolean
    factura_electronica: FacturaElectronica
  }

  # ============================================================================
  # TIPOS DE RESPUESTA
  # ============================================================================

  type AuthPayload {
    token: String!
    user: Usuario!
  }

  type EstadisticasHabitaciones {
    total: Int!
    disponibles: Int!
    ocupadas: Int!
    limpieza: Int!
    mantenimiento: Int!
    reservadas: Int!
    porcentaje_ocupacion: Float!
  }

  type CuentaHospedaje {
    hospedaje_id: Int!
    codigo: String!
    noches: Int!
    precio_noche: Float!
    subtotal_hospedaje: Float!
    consumos: [JSON!]!
    subtotal_consumos: Float!
    total: Float!
    pagado: Float!
    saldo: Float!
  }

  # ============================================================================
  # TIPOS DE REPORTES
  # ============================================================================

  # Reporte de Ocupación
  type ReporteOcupacionPorDia {
    fecha: Date!
    total_habitaciones: Int!
    ocupadas: Int!
    disponibles: Int!
    limpieza: Int!
    mantenimiento: Int!
    porcentaje_ocupacion: Float!
  }

  type ReporteOcupacionPorTipo {
    tipo: TipoHabitacion!
    total: Int!
    ocupadas_promedio: Float!
    disponibles_promedio: Float!
    porcentaje_ocupacion: Float!
    ingresos_generados: Float!
  }

  type ReporteOcupacion {
    fecha_desde: Date!
    fecha_hasta: Date!
    dias: Int!
    porcentaje_ocupacion_promedio: Float!
    ocupacion_por_dia: [ReporteOcupacionPorDia!]!
    ocupacion_por_tipo: [ReporteOcupacionPorTipo!]!
    total_noches_vendidas: Int!
    total_habitaciones_promedio: Int!
  }

  # Reporte de Ingresos
  type IngresosPorDia {
    fecha: Date!
    ingresos_hospedajes: Float!
    ingresos_consumos: Float!
    total: Float!
    num_checkouts: Int!
  }

  type IngresosPorTipo {
    tipo: TipoHabitacion!
    ingresos_hospedajes: Float!
    ingresos_consumos: Float!
    total: Float!
    num_hospedajes: Int!
    precio_promedio_noche: Float!
  }

  type ReporteIngresos {
    fecha_desde: Date!
    fecha_hasta: Date!
    total_ingresos: Float!
    ingresos_hospedajes: Float!
    ingresos_consumos: Float!
    porcentaje_hospedajes: Float!
    porcentaje_consumos: Float!
    promedio_diario: Float!
    ingresos_por_dia: [IngresosPorDia!]!
    ingresos_por_tipo: [IngresosPorTipo!]!
    num_facturas: Int!
    ticket_promedio: Float!
  }

  # Reporte de Huéspedes
  type HuespedFrecuente {
    huesped_id: Int!
    nombre_completo: String!
    email: String
    telefono: String
    num_hospedajes: Int!
    total_gastado: Float!
    ultima_visita: Date!
  }

  type ReporteHuespedes {
    fecha_desde: Date!
    fecha_hasta: Date!
    total_huespedes: Int!
    huespedes_nuevos: Int!
    huespedes_recurrentes: Int!
    huespedes_frecuentes: [HuespedFrecuente!]!
    promedio_estancia_dias: Float!
    porcentaje_nuevos: Float!
    porcentaje_recurrentes: Float!
  }

  # Reporte de Reservas
  type ReservasPorCanal {
    canal: CanalReserva!
    total: Int!
    confirmadas: Int!
    canceladas: Int!
    tasa_cancelacion: Float!
    ingresos_totales: Float!
  }

  type ReservasPorEstado {
    estado: EstadoReserva!
    cantidad: Int!
    porcentaje: Float!
  }

  type ReporteReservas {
    fecha_desde: Date!
    fecha_hasta: Date!
    total_reservas: Int!
    confirmadas: Int!
    canceladas: Int!
    no_show: Int!
    tasa_cancelacion: Float!
    tasa_no_show: Float!
    anticipo_total: Float!
    saldo_pendiente_total: Float!
    reservas_por_canal: [ReservasPorCanal!]!
    reservas_por_estado: [ReservasPorEstado!]!
  }

  # Reporte de Inventario
  type ItemBajoStock {
    id: Int!
    codigo: String
    nombre: String!
    tipo: TipoItem!
    stock_actual: Int!
    stock_minimo: Int!
    diferencia: Int!
    categoria_nombre: String
  }

  type MovimientosResumen {
    tipo_movimiento: TipoMovimiento!
    cantidad_total: Int!
    num_movimientos: Int!
  }

  type ProductoMasConsumido {
    item_id: Int!
    codigo: String
    nombre: String!
    tipo: TipoItem!
    cantidad_consumida: Int!
    veces_consumido: Int!
    categoria_nombre: String
  }

  type ReporteInventario {
    fecha_desde: Date!
    fecha_hasta: Date!
    items_bajo_stock: [ItemBajoStock!]!
    movimientos_resumen: [MovimientosResumen!]!
    total_items_activos: Int!
    total_items_bajo_stock: Int!
    valor_inventario_actual: Float!
    productos_mas_consumidos: [ProductoMasConsumido!]!
  }

  # Reporte de Métodos de Pago
  type DetallePorMetodo {
    metodo_pago_id: Int!
    metodo_nombre: String!
    codigo_dian: String
    total: Float!
    num_transacciones: Int!
    ticket_promedio: Float!
    porcentaje: Float!
  }

  type TendenciaDiariaMetodo {
    fecha: Date!
    metodo_nombre: String!
    total: Float!
  }

  type ResumenMetodosPago {
    total_recaudado: Float!
    total_transacciones: Int!
    ticket_promedio_global: Float!
    metodo_mas_usado: String
    metodo_mayor_recaudo: String
  }

  type ReporteMetodosPago {
    fecha_desde: Date!
    fecha_hasta: Date!
    resumen: ResumenMetodosPago!
    detalle_por_metodo: [DetallePorMetodo!]!
    tendencia_diaria: [TendenciaDiariaMetodo!]!
  }

  # Reporte de Cierre de Caja Diario (Night Audit)
  type PagoPorMetodoCaja {
    metodo_pago_id: Int!
    metodo_nombre: String!
    total: Float!
    num_transacciones: Int!
  }

  type ResumenCierreCaja {
    total_ingresos: Float!
    ingresos_hospedaje: Float!
    ingresos_consumos: Float!
    total_pagos_recibidos: Float!
    saldo_pendiente: Float!
    num_checkouts: Int!
    num_facturas: Int!
  }

  type ReporteCierreCaja {
    fecha: Date!
    resumen: ResumenCierreCaja!
    pagos_por_metodo: [PagoPorMetodoCaja!]!
    facturas_del_dia: [FacturaDelDia!]!
  }

  type FacturaDelDia {
    factura_id: Int!
    numero_factura: String!
    cliente_nombre: String!
    hora: String!
    total: Float!
    metodos_pago: String!
    estado: String!
  }

  # Reporte ADR y RevPAR (Indicadores Hoteleros)
  type TendenciaDiariaADR {
    fecha: Date!
    adr: Float!
    rev_par: Float!
    occupancy_rate: Float!
    habitaciones_ocupadas: Int!
    noches_vendidas: Int!
    ingresos: Float!
  }

  type PromediosPorTipo {
    tipo: String!
    adr: Float!
    rev_par: Float!
    occupancy_rate: Float!
    total_habitaciones: Int!
    habitaciones_vendidas: Float!
    ingresos_totales: Float!
  }

  type ResumenADR {
    adr_global: Float!
    rev_par_global: Float!
    occupancy_rate_global: Float!
    total_habitaciones_promedio: Float!
    total_noches_vendidas: Int!
    ingresos_totales_hospedaje: Float!
    num_checkouts: Int!
  }

  type ReporteADRRevPAR {
    fecha_desde: Date!
    fecha_hasta: Date!
    resumen: ResumenADR!
    tendencia_diaria: [TendenciaDiariaADR!]!
    promedios_por_tipo: [PromediosPorTipo!]!
  }

  # Reporte Comparativo de Períodos
  type MetricasPeriodo {
    ingresos_totales: Float!
    ingresos_hospedaje: Float!
    ingresos_consumos: Float!
    ocupacion_promedio: Float!
    adr: Float!
    rev_par: Float!
    num_checkouts: Int!
    num_reservas: Int!
    noches_vendidas: Int!
    ticket_promedio: Float!
  }

  type ComparacionMetrica {
    metrica: String!
    periodo_actual: Float!
    periodo_anterior: Float!
    variacion_absoluta: Float!
    variacion_porcentual: Float!
    tendencia: String!
  }

  type ReporteComparativo {
    periodo_actual: PeriodoInfo!
    periodo_anterior: PeriodoInfo!
    metricas_actual: MetricasPeriodo!
    metricas_anterior: MetricasPeriodo!
    comparaciones: [ComparacionMetrica!]!
  }

  type PeriodoInfo {
    fecha_desde: Date!
    fecha_hasta: Date!
    dias: Int!
    etiqueta: String!
  }

  # ============================================================================
  # REPORTE FUENTES DE RESERVA (CANALES)
  # ============================================================================

  type CanalStats {
    canal: String!
    canal_nombre: String!
    color: String
    total_reservas: Int!
    confirmadas: Int!
    canceladas: Int!
    no_show: Int!
    tasa_confirmacion: Float!
    tasa_cancelacion: Float!
    ingresos_totales: Float!
    ingresos_promedio: Float!
    comision_pct: Float
    comision_estimada: Float
    noches_totales: Int!
  }

  type TendenciaCanalDiaria {
    fecha: Date!
    directo: Int!
    booking: Int!
    airbnb: Int!
    expedia: Int!
    telefono: Int!
    web: Int!
    walk_in: Int!
    otros: Int!
  }

  type ResumenFuentesReserva {
    total_reservas: Int!
    total_confirmadas: Int!
    total_canceladas: Int!
    total_noshow: Int!
    ingresos_totales: Float!
    canal_principal: String!
    pct_directo: Float!
    pct_otas: Float!
    comisiones_estimadas: Float!
  }

  type ReporteFuentesReserva {
    fecha_desde: Date!
    fecha_hasta: Date!
    resumen: ResumenFuentesReserva!
    canales: [CanalStats!]!
    tendencia_diaria: [TendenciaCanalDiaria!]!
  }

  # ============================================================================
  # REPORTE ANÁLISIS DE CANCELACIONES
  # ============================================================================

  type ResumenCancelaciones {
    total_reservas: Int!
    total_canceladas: Int!
    total_noshow: Int!
    total_completadas: Int!
    tasa_cancelacion: Float!
    tasa_noshow: Float!
    tasa_completitud: Float!
    ingresos_perdidos: Float!
    anticipos_perdidos: Float!
    lead_time_promedio: Float!
  }

  type CancelacionPorCanal {
    canal: String!
    canal_nombre: String!
    total_reservas: Int!
    canceladas: Int!
    noshow: Int!
    tasa_cancelacion: Float!
    tasa_noshow: Float!
    ingresos_perdidos: Float!
  }

  type CancelacionPorDiaSemana {
    dia_semana: Int!
    dia_nombre: String!
    total_reservas: Int!
    canceladas: Int!
    tasa_cancelacion: Float!
  }

  type TendenciaCancelaciones {
    fecha: Date!
    total_reservas: Int!
    canceladas: Int!
    noshow: Int!
    tasa_cancelacion: Float!
  }

  type CancelacionPorAnticipacion {
    rango: String!
    total_reservas: Int!
    canceladas: Int!
    tasa_cancelacion: Float!
    descripcion: String!
  }

  type ReporteCancelaciones {
    fecha_desde: Date!
    fecha_hasta: Date!
    resumen: ResumenCancelaciones!
    por_canal: [CancelacionPorCanal!]!
    por_dia_semana: [CancelacionPorDiaSemana!]!
    por_anticipacion: [CancelacionPorAnticipacion!]!
    tendencia: [TendenciaCancelaciones!]!
  }

  # ============================================================================
  # REPORTES FISCALES DIAN
  # ============================================================================

  type FacturaLibroVentas {
    factura_electronica_id: Int!
    numero_factura_dian: String!
    numero_factura_interna: String!
    fecha_factura: Date!
    cufe: String
    tipo_documento: String!
    cliente_nombre: String!
    cliente_tipo_documento: String!
    cliente_numero_documento: String!
    base_gravable: Float!
    iva: Float!
    total: Float!
    estado_dian: String!
    fecha_envio: Date
  }

  type ResumenLibroVentas {
    total_facturas: Int!
    total_facturas_aceptadas: Int!
    total_facturas_rechazadas: Int!
    total_facturas_pendientes: Int!
    total_facturas_no_transmitidas: Int!
    base_gravable_total: Float!
    iva_total: Float!
    gran_total: Float!
  }

  type LibroVentasPorEstado {
    estado_dian: String!
    cantidad: Int!
    base_gravable: Float!
    iva: Float!
    total: Float!
  }

  type ReporteLibroVentas {
    fecha_desde: Date!
    fecha_hasta: Date!
    resumen: ResumenLibroVentas!
    facturas: [FacturaLibroVentas!]!
    por_estado: [LibroVentasPorEstado!]!
  }

  # ============================================================================
  # REPORTE DE IVA
  # ============================================================================
  type ResumenIVA {
    total_facturas: Int!
    base_gravable_total: Float!
    base_exenta_total: Float!
    iva_hospedaje: Float!
    iva_consumos: Float!
    iva_servicios: Float!
    iva_total: Float!
    gran_total: Float!
  }

  type DetalleIVA {
    factura_id: Int!
    numero_factura: String!
    fecha: String!
    cliente_nombre: String!
    cliente_documento: String!
    base_gravable: Float!
    tarifa_iva: Float!
    iva_generado: Float!
    total: Float!
    categoria: String!
  }

  type IVAPorTarifa {
    tarifa: Float!
    base_gravable: Float!
    iva_generado: Float!
    cantidad: Int!
  }

  type IVAPorCategoria {
    categoria: String!
    base_gravable: Float!
    iva: Float!
    cantidad: Int!
  }

  type ReporteIVA {
    resumen: ResumenIVA!
    detalles: [DetalleIVA!]!
    por_tarifa: [IVAPorTarifa!]!
    por_categoria: [IVAPorCategoria!]!
  }

  # ============================================================================
  # REPORTE DE ICA
  # ============================================================================
  type ResumenICA {
    ingresos_brutos_total: Float!
    tarifa_ica: Float!
    ica_total: Float!
    total_facturas: Int!
    aplica_ica: Boolean!
  }

  type DetalleICA {
    factura_id: Int!
    numero_factura: String!
    fecha: String!
    cliente_nombre: String!
    ingresos: Float!
    ica_calculado: Float!
  }

  type ICAPorMes {
    mes: String!
    ingresos: Float!
    ica: Float!
    cantidad: Int!
  }

  type ReporteICA {
    resumen: ResumenICA!
    detalles: [DetalleICA!]!
    por_mes: [ICAPorMes!]!
  }

  type ItemPorCategoria {
    categoria_id: Int
    categoria_nombre: String!
    cantidad: Int!
    valor_total: Float!
  }

  type EstadisticasInventario {
    total_items: Int!
    total_productos: Int!
    total_servicios: Int!
    items_bajo_stock: Int!
    valor_total_inventario: Float!
    items_por_categoria: [ItemPorCategoria!]!
    productos_mas_consumidos: [ProductoMasConsumido!]!
  }

  # ============================================================================
  # CONFIGURACIÓN
  # ============================================================================

  type DatosHotel {
    id: Int!
    # Información Legal
    nombre_comercial: String!
    razon_social: String!
    nit: String!
    digito_verificacion: String
    tipo_persona: String!
    regimen_tributario: String!
    # Dirección
    direccion: String!
    ciudad: String!
    departamento: String!
    codigo_postal: String
    pais: String!
    # Contacto
    telefono: String
    celular: String
    email: String!
    sitio_web: String
    # DIAN
    resolucion_dian: String
    fecha_inicio_resolucion: Date
    fecha_fin_resolucion: Date
    prefijo_factura: String!
    numero_actual_factura: Int!
    rango_inicial_factura: Int
    rango_final_factura: Int
    ambiente_dian: String!
    # Branding
    logo_url: String
    color_primario: String
    color_secundario: String
    eslogan: String
    descripcion_empresa: String
    # Configuración
    moneda: String!
    timezone: String!
    idioma: String!
    # Metadatos
    created_at: DateTime!
    updated_at: DateTime!
    activo: Boolean!
  }

  type ParametrosGenerales {
    id: Int!
    # Horarios
    hora_checkin: String!
    hora_checkout: String!
    hora_apertura: String!
    hora_cierre: String!
    # Políticas de reserva
    anticipo_minimo_pct: Float!
    dias_cancelacion_gratuita: Int!
    penalizacion_cancelacion_pct: Float!
    max_dias_reserva_anticipada: Int!
    max_noches_por_reserva: Int!
    # Políticas de hospedaje
    tolerancia_late_checkout_min: Int!
    cargo_late_checkout_pct: Float!
    tolerancia_early_checkin_min: Int!
    cargo_early_checkin_pct: Float!
    permite_mascotas: Boolean!
    cargo_mascota: Float!
    # Configuración fiscal
    iva_hospedaje: Float!
    iva_consumos: Float!
    iva_servicios: Float!
    aplica_retefuente: Boolean!
    porcentaje_retefuente: Float!
    aplica_ica: Boolean!
    porcentaje_ica: Float!
    # Notificaciones automáticas
    enviar_confirmacion_reserva: Boolean!
    enviar_recordatorio_checkin: Boolean!
    dias_recordatorio_checkin: Int!
    enviar_agradecimiento_checkout: Boolean!
    enviar_factura_email: Boolean!
    # Alertas
    alerta_stock_bajo: Boolean!
    alerta_habitaciones_sucias: Int!
    alerta_vencimiento_resolucion_dias: Int!
    backup_automatico: Boolean!
    frecuencia_backup_horas: Int!
    # Facturación
    redondeo_facturas: Boolean!
    decimales_moneda: Int!
    mostrar_saldo_cuenta: Boolean!
    dias_validez_cotizacion: Int!
    # Metadatos
    created_at: DateTime!
    updated_at: DateTime!
    activo: Boolean!
  }

  type TipoHabitacionConfig {
    codigo: String!
    nombre: String!
    descripcion: String
    capacidad_adultos: Int!
    capacidad_ninos: Int!
    precio_base: Float!
    metros_cuadrados: Float
    comodidades: JSON
    orden: Int!
    activo: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type CanalReservaConfig {
    codigo: String!
    nombre: String!
    descripcion: String
    comision_pct: Float!
    requiere_pago_anticipado: Boolean!
    url_integracion: String
    color_identificacion: String
    icono: String
    orden: Int!
    activo: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type NotificacionesConfig {
    id: Int!
    # Email
    email_habilitado: Boolean!
    email_servidor: String
    email_puerto: Int
    email_usuario: String
    email_remitente: String
    email_nombre_remitente: String
    email_usa_tls: Boolean!
    # SMS
    sms_habilitado: Boolean!
    sms_proveedor: String
    sms_remitente: String
    # WhatsApp
    whatsapp_habilitado: Boolean!
    whatsapp_proveedor: String
    whatsapp_numero: String
    # Notificaciones de Reservas
    notif_nueva_reserva_email: Boolean!
    notif_nueva_reserva_sms: Boolean!
    notif_nueva_reserva_whatsapp: Boolean!
    notif_confirmacion_reserva_email: Boolean!
    notif_confirmacion_reserva_sms: Boolean!
    notif_confirmacion_reserva_whatsapp: Boolean!
    notif_cancelacion_reserva_email: Boolean!
    notif_cancelacion_reserva_sms: Boolean!
    notif_cancelacion_reserva_whatsapp: Boolean!
    notif_recordatorio_checkin_email: Boolean!
    notif_recordatorio_checkin_sms: Boolean!
    notif_recordatorio_checkin_whatsapp: Boolean!
    notif_dias_antes_recordatorio: Int!
    # Notificaciones de Hospedaje
    notif_checkin_email: Boolean!
    notif_checkin_sms: Boolean!
    notif_checkin_whatsapp: Boolean!
    notif_checkout_email: Boolean!
    notif_checkout_sms: Boolean!
    notif_checkout_whatsapp: Boolean!
    # Notificaciones de Facturación
    notif_factura_email: Boolean!
    notif_factura_sms: Boolean!
    notif_factura_whatsapp: Boolean!
    # Notificaciones Administrativas
    notif_stock_bajo_email: Boolean!
    notif_vencimiento_resolucion_email: Boolean!
    notif_habitaciones_sucias_email: Boolean!
    emails_admin: String
    # Plantillas
    plantilla_confirmacion_reserva: String
    plantilla_recordatorio_checkin: String
    plantilla_factura: String
    plantilla_agradecimiento: String
    # Metadatos
    created_at: DateTime!
    updated_at: DateTime!
    activo: Boolean!
  }

  # ============================================================================
  # INPUTS
  # ============================================================================

  input CrearHabitacionInput {
    numero: String!
    piso: Int!
    tipo: TipoHabitacion!
    capacidad: Int!
    precio_noche: Float!
    descripcion: String
    comodidades: JSON
    imagen_url: String
  }

  input ActualizarHabitacionInput {
    numero: String
    piso: Int
    tipo: TipoHabitacion
    capacidad: Int
    precio_noche: Float
    descripcion: String
    comodidades: JSON
    estado: EstadoHabitacion
    imagen_url: String
  }

  input CrearClienteInput {
    nombre: String!
    apellido: String
    tipo_documento: TipoDocumento           # Legacy (mantener por compatibilidad)
    tipo_documento_dian: Int                # Código numérico DIAN (calculado automáticamente si falta)
    numero_documento: String
    digito_verificacion: String             # Dígito de verificación para NIT
    telefono: String
    email: String
    direccion: String
    ciudad: String
    codigo_municipio: String!               # Código DANE del municipio (OBLIGATORIO para DIAN)
    pais: String
    fecha_nacimiento: Date
    regimen_tributario: String              # Común, Simplificado, Grande Contribuyente
    responsable_iva: Boolean                # Indica si es responsable de IVA
    observaciones: String
    activo: Boolean                         # Estado del cliente (true=activo, false=inactivo)
  }

  input CrearHuespedInput {
    cliente_id: Int!
    nombre: String!
    apellido: String
    tipo_documento: TipoDocumento!
    numero_documento: String!
    fecha_nacimiento: Date
    nacionalidad: String
    telefono: String
    email: String
    direccion: String
    ciudad: String
    pais: String
    contacto_emergencia: String
    telefono_emergencia: String
    observaciones: String
    preferencias: JSON
    # Campos TRA (Tarjeta de Registro de Alojamiento)
    lugar_residencia: String
    lugar_procedencia: String
    motivo_viaje: String
  }

  input CrearReservaInput {
    habitacion_id: Int!
    huesped_id: Int!
    fecha_entrada: Date!
    fecha_salida: Date!
    num_adultos: Int!
    num_ninos: Int
    canal: CanalReserva
    observaciones: String
    notas_especiales: String
    precio_noche: Float
    anticipo: Float
  }

  input ActualizarReservaInput {
    habitacion_id: Int
    fecha_entrada: Date
    fecha_salida: Date
    num_adultos: Int
    num_ninos: Int
    observaciones: String
  }

  input CheckInInput {
    habitacion_id: Int!
    huesped_id: Int!
    reserva_id: Int
    fecha_entrada: Date
    fecha_salida_prevista: Date!
    num_adultos: Int!
    num_ninos: Int
    acompanantes: JSON
    observaciones: String
  }

  input MetodoPagoInput {
    metodo_pago_id: Int!
    monto: Float!
    referencia: String
  }

  input CrearMetodoPagoInput {
    nombre: String!
    codigo_dian: String!
    tipo: String!
    requiere_referencia: Boolean
    icono: String
    orden: Int
  }

  input ActualizarMetodoPagoInput {
    nombre: String
    codigo_dian: String
    tipo: String
    requiere_referencia: Boolean
    icono: String
    orden: Int
    activo: Boolean
  }

  input CheckOutInput {
    hospedaje_id: Int!
    fecha_salida_real: Date
    metodos_pago: [MetodoPagoInput!]!
    impuestos: Float
    descuento: Float
    observaciones: String
  }

  input CrearServicioHotelInput {
    nombre: String!
    descripcion: String
    categoria: CategoriaServicio!
    precio: Float!
    unidad_medida: String
    duracion_minutos: Int
    incluye_iva: Boolean
    iva_porcentaje: Float
  }

  input ActualizarServicioHotelInput {
    nombre: String
    descripcion: String
    categoria: CategoriaServicio
    precio: Float
    unidad_medida: String
    duracion_minutos: Int
    incluye_iva: Boolean
    iva_porcentaje: Float
    activo: Boolean
  }

  input AgregarConsumoInput {
    hospedaje_id: Int!
    habitacion_id: Int!
    item_inventario_id: Int
    producto_id: Int
    servicio_id: Int
    descripcion: String!
    cantidad: Int!
    precio_unitario: Float!
    notas: String
  }

  input ActualizarConsumoInput {
    descripcion: String
    cantidad: Int
    precio_unitario: Float
    notas: String
  }

  input CrearCategoriaInput {
    nombre: String!
    descripcion: String
    tipo: TipoCategoria!
    color: String
    icono: String
    orden: Int
  }

  input ActualizarCategoriaInput {
    nombre: String
    descripcion: String
    tipo: TipoCategoria
    color: String
    icono: String
    orden: Int
    activa: Boolean
  }

  input CrearItemInventarioInput {
    codigo: String
    nombre: String!
    descripcion: String
    tipo: TipoItem!
    categoria_id: Int!
    precio_base: Float!
    iva_porcentaje: Float
    stock_actual: Int
    stock_minimo: Int
    unidad_medida: String
    ubicacion_almacen: String
    duracion_minutos: Int
    precio_compra: Float
    margen_utilidad: Float
    imagen_url: String
    notas: String
  }

  input ActualizarItemInventarioInput {
    codigo: String
    nombre: String
    descripcion: String
    tipo: TipoItem
    categoria_id: Int
    precio_base: Float
    iva_porcentaje: Float
    stock_minimo: Int
    unidad_medida: String
    ubicacion_almacen: String
    duracion_minutos: Int
    precio_compra: Float
    margen_utilidad: Float
    activo: Boolean
    imagen_url: String
    notas: String
  }

  input AjustarStockInput {
    item_inventario_id: Int!
    tipo_movimiento: TipoMovimiento!
    cantidad: Int!
    motivo: String!
  }

  # Inputs de Configuración
  input DatosHotelInput {
    nombre_comercial: String
    razon_social: String
    nit: String
    digito_verificacion: String
    tipo_persona: String
    regimen_tributario: String
    direccion: String
    ciudad: String
    departamento: String
    codigo_postal: String
    pais: String
    telefono: String
    celular: String
    email: String
    sitio_web: String
    resolucion_dian: String
    fecha_inicio_resolucion: Date
    fecha_fin_resolucion: Date
    prefijo_factura: String
    numero_actual_factura: Int
    rango_inicial_factura: Int
    rango_final_factura: Int
    clave_tecnica_dian: String
    ambiente_dian: String
    logo_url: String
    color_primario: String
    color_secundario: String
    eslogan: String
    descripcion_empresa: String
    moneda: String
    timezone: String
    idioma: String
  }

  input ParametrosGeneralesInput {
    hora_checkin: String
    hora_checkout: String
    hora_apertura: String
    hora_cierre: String
    anticipo_minimo_pct: Float
    dias_cancelacion_gratuita: Int
    penalizacion_cancelacion_pct: Float
    max_dias_reserva_anticipada: Int
    max_noches_por_reserva: Int
    tolerancia_late_checkout_min: Int
    cargo_late_checkout_pct: Float
    tolerancia_early_checkin_min: Int
    cargo_early_checkin_pct: Float
    permite_mascotas: Boolean
    cargo_mascota: Float
    iva_hospedaje: Float
    iva_consumos: Float
    iva_servicios: Float
    aplica_retefuente: Boolean
    porcentaje_retefuente: Float
    aplica_ica: Boolean
    porcentaje_ica: Float
    enviar_confirmacion_reserva: Boolean
    enviar_recordatorio_checkin: Boolean
    dias_recordatorio_checkin: Int
    enviar_agradecimiento_checkout: Boolean
    enviar_factura_email: Boolean
    alerta_stock_bajo: Boolean
    alerta_habitaciones_sucias: Int
    alerta_vencimiento_resolucion_dias: Int
    backup_automatico: Boolean
    frecuencia_backup_horas: Int
    redondeo_facturas: Boolean
    decimales_moneda: Int
    mostrar_saldo_cuenta: Boolean
    dias_validez_cotizacion: Int
  }

  input TipoHabitacionConfigInput {
    codigo: String
    nombre: String
    descripcion: String
    capacidad_adultos: Int
    capacidad_ninos: Int
    precio_base: Float
    metros_cuadrados: Float
    comodidades: JSON
    orden: Int
    activo: Boolean
  }

  input CanalReservaConfigInput {
    codigo: String
    nombre: String
    descripcion: String
    comision_pct: Float
    requiere_pago_anticipado: Boolean
    url_integracion: String
    color_identificacion: String
    icono: String
    orden: Int
    activo: Boolean
  }

  input NotificacionesConfigInput {
    email_habilitado: Boolean
    email_servidor: String
    email_puerto: Int
    email_usuario: String
    email_password: String
    email_remitente: String
    email_nombre_remitente: String
    email_usa_tls: Boolean
    sms_habilitado: Boolean
    sms_proveedor: String
    sms_api_key: String
    sms_api_secret: String
    sms_remitente: String
    whatsapp_habilitado: Boolean
    whatsapp_proveedor: String
    whatsapp_api_key: String
    whatsapp_api_secret: String
    whatsapp_numero: String
    notif_nueva_reserva_email: Boolean
    notif_nueva_reserva_sms: Boolean
    notif_nueva_reserva_whatsapp: Boolean
    notif_confirmacion_reserva_email: Boolean
    notif_confirmacion_reserva_sms: Boolean
    notif_confirmacion_reserva_whatsapp: Boolean
    notif_cancelacion_reserva_email: Boolean
    notif_cancelacion_reserva_sms: Boolean
    notif_cancelacion_reserva_whatsapp: Boolean
    notif_recordatorio_checkin_email: Boolean
    notif_recordatorio_checkin_sms: Boolean
    notif_recordatorio_checkin_whatsapp: Boolean
    notif_dias_antes_recordatorio: Int
    notif_checkin_email: Boolean
    notif_checkin_sms: Boolean
    notif_checkin_whatsapp: Boolean
    notif_checkout_email: Boolean
    notif_checkout_sms: Boolean
    notif_checkout_whatsapp: Boolean
    notif_factura_email: Boolean
    notif_factura_sms: Boolean
    notif_factura_whatsapp: Boolean
    notif_stock_bajo_email: Boolean
    notif_vencimiento_resolucion_email: Boolean
    notif_habitaciones_sucias_email: Boolean
    emails_admin: String
    plantilla_confirmacion_reserva: String
    plantilla_recordatorio_checkin: String
    plantilla_factura: String
    plantilla_agradecimiento: String
  }

  input UsuarioInput {
    usuario: String
    nombre: String
    apellido: String
    email: String
    password: String
    pin: String
    rol: RolUsuario
    telefono: String
    activo: Boolean
  }

  # ============================================================================
  # INPUTS - FACTURACIÓN ELECTRÓNICA
  # ============================================================================

  input ConfiguracionFactusInput {
    endpoint: String
    email: String
    password: String
    client_id: String
    client_secret: String
    ambiente: String
    email_facturacion: String
    activo: Boolean
    iva_hospedaje: Float
    iva_consumos: Float
    iva_servicios: Float
  }

  input CrearNotaCreditoInput {
    factura_electronica_id: Int!
    motivo: String!
    valor_total: Float!
    items: JSON!
  }

  # Input para items de nota de crédito desde FactuBox
  input ItemNotaCreditoInput {
    descripcion: String!
    codigo: String
    cantidad: Int!
    precio_unitario: Float!
    iva_porcentaje: Float
  }

  # Input para crear nota de crédito desde FactuBox
  input CrearNotaCreditoFactuBoxInput {
    factura_electronica_id: Int!
    tipo_nota: String!
    motivo: String!
    items: [ItemNotaCreditoInput!]!
  }

  # ============================================================================
  # TIPOS Y INPUTS - CONSECUTIVOS (RESOLUCIONES DIAN)
  # ============================================================================

  type ResolucionDian {
    id: Int!
    tipo_documento: String!
    nombre: String!
    resolucion: String
    prefijo: String!
    numero_inicial: String!
    numero_final: String!
    numero_actual: String!
    fecha_inicio: Date
    fecha_fin: Date
    activo: Boolean!
    factus_numbering_range_id: Int
    transmision_automatica: Boolean
    numeros_usados: Int
    numeros_disponibles: Int
    porcentaje_uso: Float
    created_at: DateTime
    updated_at: DateTime
  }

  input ResolucionDianInput {
    tipo_documento: String!
    nombre: String!
    resolucion: String
    prefijo: String!
    numero_inicial: String!
    numero_final: String!
    numero_actual: String
    fecha_inicio: Date
    fecha_fin: Date
    activo: Boolean
    factus_numbering_range_id: Int
    transmision_automatica: Boolean
  }

  # ============================================================================
  # TIPOS SISTEMA POS
  # ============================================================================

  # Caja Registradora
  type Caja {
    id: Int!
    codigo: String!
    nombre: String!
    ubicacion: String
    activa: Boolean!
    created_at: DateTime
    updated_at: DateTime
  }

  # Descuento
  type Descuento {
    id: Int!
    codigo: String!
    nombre: String!
    descripcion: String
    tipo: TipoDescuento!
    valor: Float!
    monto_minimo: Float
    categoria_aplicable: CategoriaInventario
    tipo_item_aplicable: String
    fecha_inicio: Date
    fecha_fin: Date
    dias_semana: String
    hora_inicio: String
    hora_fin: String
    requiere_autorizacion: Boolean!
    rol_autorizador: String
    activo: Boolean!
    created_at: DateTime
    updated_at: DateTime
    created_by: Usuario
  }

  # Turno de Caja
  type TurnoCaja {
    id: Int!
    codigo: String!
    caja: Caja!
    usuario: Usuario!
    fecha_apertura: DateTime!
    monto_inicial: Float!
    notas_apertura: String
    fecha_cierre: DateTime
    monto_esperado: Float
    monto_real: Float
    diferencia: Float
    notas_cierre: String
    estado: EstadoTurnoCaja!
    created_by: Usuario
    closed_by: Usuario
    created_at: DateTime
    # Relaciones
    ventas: [VentaPOS!]
    movimientos: [MovimientoCaja!]
    arqueo: [ArqueoCaja!]
  }

  # Detalle completo de Turno de Caja para visualización e impresión
  type DetalleTurnoCaja {
    turno: TurnoCaja!
    movimientos: [MovimientoCaja!]!
    arqueo: [ArqueoCaja!]!
    ventas_por_metodo: [VentaPorMetodoPago!]!
    total_ventas: Float!
    total_ingresos: Float!
    total_egresos: Float!
  }

  # Ventas agrupadas por método de pago
  type VentaPorMetodoPago {
    metodo: String!
    monto: Float!
    cantidad_transacciones: Int!
  }

  # Arqueo de Caja (conteo de denominaciones)
  type ArqueoCaja {
    id: Int!
    turno_caja: TurnoCaja!
    denominacion: String!
    cantidad: Int!
    valor_unitario: Float!
    subtotal: Float!
    created_at: DateTime
  }

  # Movimiento de Caja
  type MovimientoCaja {
    id: Int!
    turno_caja: TurnoCaja!
    tipo: TipoMovimientoCaja!
    concepto: ConceptoMovimientoCaja!
    monto: Float!
    metodo_pago: MetodoPago
    venta_pos: VentaPOS
    factura: Factura
    referencia: String
    descripcion: String
    created_by: Usuario
    created_at: DateTime
  }

  # Venta POS
  type VentaPOS {
    id: Int!
    codigo: String!
    turno_caja: TurnoCaja!
    tipo_cliente: TipoCliente!
    cliente: Cliente
    huesped: Huesped
    hospedaje: Hospedaje
    subtotal: Float!
    descuento_porcentaje: Float
    descuento_monto: Float
    descuento: Descuento
    requiere_autorizacion_descuento: Boolean
    autorizado_por: Usuario
    iva: Float!
    propina: Float
    total: Float!
    estado_pago: EstadoPagoVenta!
    notas: String
    factura: Factura
    created_by: Usuario
    anulado_by: Usuario
    fecha_anulacion: DateTime
    motivo_anulacion: String
    created_at: DateTime
    # Relaciones
    detalles: [DetalleVentaPOS!]!
    pagos: [VentaPOSPago!]!
  }

  # Detalle de Venta POS
  type DetalleVentaPOS {
    id: Int!
    venta_pos: VentaPOS!
    item_inventario: ItemInventario
    servicio_hotel: ServicioHotel
    cantidad: Float!
    precio_unitario: Float!
    precio_total: Float!
    notas: String
    created_at: DateTime
  }

  # Pago de Venta POS
  type VentaPOSPago {
    id: Int!
    venta_pos: VentaPOS!
    metodo_pago: MetodoPago!
    monto: Float!
    referencia: String
    monto_recibido: Float
    cambio: Float
    created_at: DateTime
  }

  # Resumen de Turno (para dashboard)
  type ResumenTurnoCaja {
    turno: TurnoCaja!
    num_ventas: Int!
    total_ventas: Float!
    total_ingresos: Float!
    total_egresos: Float!
    efectivo_esperado: Float!
    ingresos_por_metodo: [IngresoMetodo!]!
  }

  type IngresoMetodo {
    metodo_pago: MetodoPago!
    cantidad: Int!
    total: Float!
  }

  # Turno con resumen para historial
  type TurnoConResumen {
    id: Int!
    codigo: String!
    usuario: Usuario
    fecha_apertura: DateTime!
    fecha_cierre: DateTime
    monto_inicial: Float!
    monto_esperado: Float
    monto_real: Float
    diferencia: Float
    estado: EstadoTurnoCaja!
    num_ventas: Int!
    total_ventas: Float!
  }

  # Respuesta paginada de historial de turnos
  type HistorialTurnosResponse {
    turnos: [TurnoConResumen!]!
    total: Int!
  }

  # Producto Más Vendido (para reportes)
  type ProductoMasVendido {
    item_id: Int!
    item_nombre: String!
    categoria_id: Int
    categoria_nombre: String
    cantidad_vendida: Float!
    num_ventas: Int!
    ingresos_totales: Float!
    precio_promedio: Float!
    precio_compra: Float
    costo_total: Float!
    utilidad_total: Float!
    margen_utilidad_porcentaje: Float!
    item: ItemInventario
    categoria: CategoriaInventario
  }

  # Estadísticas de Ventas POS
  type EstadisticasVentasPOS {
    num_ventas: Int!
    total_subtotal: Float!
    total_descuentos: Float!
    total_iva: Float!
    total_propinas: Float!
    total_ventas: Float!
    ticket_promedio: Float!
  }

  type VentaPorHora {
    hora: Int!
    num_ventas: Int!
    total: Float!
  }

  # ============================================================================
  # INPUTS SISTEMA POS
  # ============================================================================

  # Inputs para Descuentos
  input CrearDescuentoInput {
    codigo: String!
    nombre: String!
    descripcion: String
    tipo: TipoDescuento!
    valor: Float!
    monto_minimo: Float
    categoria_aplicable: Int
    tipo_item_aplicable: String
    fecha_inicio: Date
    fecha_fin: Date
    dias_semana: String
    hora_inicio: String
    hora_fin: String
    requiere_autorizacion: Boolean
    rol_autorizador: String
    activo: Boolean
  }

  input ActualizarDescuentoInput {
    nombre: String
    descripcion: String
    valor: Float
    monto_minimo: Float
    fecha_inicio: Date
    fecha_fin: Date
    activo: Boolean
  }

  # Inputs para Turnos de Caja
  input AbrirCajaInput {
    caja_id: Int!
    monto_inicial: Float!
    notas_apertura: String
    password: String!
  }

  input CerrarCajaInput {
    turno_caja_id: Int!
    arqueo: [ArqueoInput!]!
    notas_cierre: String
    password: String!
  }

  input ArqueoInput {
    denominacion: String!
    cantidad: Int!
    valor_unitario: Float!
  }

  input RegistrarRetiroInput {
    turno_caja_id: Int!
    monto: Float!
    motivo: String!
  }

  # Inputs para Ventas POS
  input CrearVentaPOSInput {
    turno_caja_id: Int!
    tipo_cliente: TipoCliente!
    cliente_id: Int
    huesped_id: Int
    hospedaje_id: Int
    items: [DetalleVentaInput!]!
    descuento_id: Int
    descuento_porcentaje_manual: Float
    descuento_monto_manual: Float
    propina: Float
    notas: String
    metodos_pago: [PagoVentaInput!]!
    requiere_autorizacion_descuento: Boolean
    autorizado_por: Int
  }

  input DetalleVentaInput {
    item_inventario_id: Int
    servicio_hotel_id: Int
    cantidad: Float!
    precio_unitario: Float!
    descuento_linea: Float
    notas: String
  }

  input PagoVentaInput {
    metodo_pago_id: Int!
    monto: Float!
    referencia: String
    monto_recibido: Float
  }

  input AnularVentaPOSInput {
    venta_pos_id: Int!
    motivo: String!
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  type Query {
    # Autenticación
    me: Usuario

    # Habitaciones
    habitaciones(estado: EstadoHabitacion, piso: Int): [Habitacion!]!
    habitacion(id: Int!): Habitacion
    habitacionPorNumero(numero: String!): Habitacion
    habitacionesDisponibles(fecha_entrada: Date!, fecha_salida: Date!, tipo: TipoHabitacion): [Habitacion!]!
    estadisticasHabitaciones: EstadisticasHabitaciones!
    ocupacionPorTipo: [JSON!]!

    # Clientes
    clientes(busqueda: String, activo: Boolean): [Cliente!]!
    cliente(id: Int!): Cliente

    # Huéspedes
    huespedes: [Huesped!]!
    huesped(id: Int!): Huesped
    huespedPorDocumento(numero_documento: String!): Huesped
    huespedesDelCliente(cliente_id: Int!): [Huesped!]!

    # Municipios DANE
    municipiosDane: [MunicipioDane!]!

    # Tipos de Documento DIAN
    tiposDocumentoDian(activo: Boolean): [TipoDocumentoDian!]!
    tipoDocumentoDian(codigo_dian: Int!): TipoDocumentoDian

    # Facturación Electrónica
    configuracionFactus: ConfiguracionFactus
    facturasElectronicas(limite: Int, factura_id: Int): [FacturaElectronica!]!
    facturaElectronica(id: Int!): FacturaElectronica
    facturaElectronicaPorFacturaId(factura_id: Int!): FacturaElectronica
    notasCredito(factura_electronica_id: Int): [NotaCredito!]!
    notaCredito(id: Int!): NotaCredito

    # Rangos de numeración de Factus
    factusNumberingRanges: [FactusNumberingRange!]!

    # FactuBox - Gestión de Facturas Electrónicas
    listarFacturasElectronicas(
      fecha_inicio: String
      fecha_fin: String
      busqueda: String
      estado_dian: String
      limit: Int
      offset: Int
    ): ListadoFacturasElectronicas!
    listarNotasCredito(
      fecha_inicio: String
      fecha_fin: String
      busqueda: String
      limit: Int
      offset: Int
    ): ListadoNotasCredito!
    obtenerFacturaElectronicaCompleta(factura_electronica_id: Int!): FacturaElectronicaCompleta

    # Notas de Crédito - FactuBox
    facturasElegiblesParaNC(busqueda: String, limit: Int, offset: Int): ListadoFacturasElegiblesNC!
    obtenerFacturaParaNC(factura_electronica_id: Int!): FacturaElegibleNC

    # Consecutivos - Resoluciones DIAN
    resoluciones: [ResolucionDian!]!
    resolucion(id: Int!): ResolucionDian
    resolucionActiva(tipo_documento: String!): ResolucionDian

    # Reservas
    reservas(estado: EstadoReserva, fecha_desde: Date, fecha_hasta: Date): [Reserva!]!
    reserva(id: Int!): Reserva
    reservaPorCodigo(codigo: String!): Reserva
    reservasDelDia: [Reserva!]!
    reservasProximas(dias: Int): [Reserva!]!
    alertasReservas: AlertasReservas!

    # Calendario Unificado (Reservas + Walk-In)
    eventosCalendario(
      fecha_desde: Date
      fecha_hasta: Date
      habitacion_id: Int
    ): [CalendarioEvento!]!

    # Hospedajes
    hospedajes(estado: EstadoHospedaje): [Hospedaje!]!
    hospedaje(id: Int!): Hospedaje
    hospedajePorCodigo(codigo: String!): Hospedaje
    hospedajesActivos: [Hospedaje!]!
    cuentaHospedaje(hospedaje_id: Int!, fecha_salida: DateTime): CuentaHospedaje!

    # Servicios
    serviciosHotel(activo: Boolean): [ServicioHotel!]!
    servicioHotel(id: Int!): ServicioHotel
    serviciosPorCategoria(categoria: CategoriaServicio!): [ServicioHotel!]!

    # Productos
    productos(categoria: String, activo: Boolean): [Producto!]!
    buscarProductos(termino: String!): [Producto!]!

    # Consumos
    consumosPorHospedaje(hospedaje_id: Int!): [ConsumoHabitacion!]!
    consumo(id: Int!): ConsumoHabitacion
    consumosNoFacturados(hospedaje_id: Int): [ConsumoHabitacion!]!
    resumenConsumos(hospedaje_id: Int!): ResumenConsumos!

    # Métodos de pago
    metodosPago(activo: Boolean): [MetodoPago!]!

    # Categorías de inventario
    categoriasInventario(tipo: TipoCategoria, activa: Boolean): [CategoriaInventario!]!
    categoriaInventario(id: Int!): CategoriaInventario

    # Items de inventario
    itemsInventario(tipo: TipoItem, categoria_id: Int, activo: Boolean, busqueda: String): [ItemInventario!]!
    itemInventario(id: Int!): ItemInventario
    estadisticasInventario: EstadisticasInventario!
    itemInventarioPorCodigo(codigo: String!): ItemInventario
    itemsBajoStock: [ItemInventario!]!

    # Movimientos de inventario
    movimientosInventario(item_inventario_id: Int, tipo_movimiento: TipoMovimiento, fecha_desde: Date, fecha_hasta: Date): [MovimientoInventario!]!

    # Configuración
    datosHotel: DatosHotel
    parametrosGenerales: ParametrosGenerales
    tiposHabitacionConfig(activo: Boolean): [TipoHabitacionConfig!]!
    tipoHabitacionConfig(codigo: String!): TipoHabitacionConfig
    canalesReservaConfig(activo: Boolean): [CanalReservaConfig!]!
    canalReservaConfig(codigo: String!): CanalReservaConfig
    notificacionesConfig: NotificacionesConfig
    usuarios(activo: Boolean): [Usuario!]!

    # ============================================================================
    # QUERIES SISTEMA POS
    # ============================================================================

    # Cajas
    cajas(activa: Boolean): [Caja!]!
    caja(id: Int!): Caja

    # Descuentos
    descuentos(activo: Boolean, tipo: TipoDescuento): [Descuento!]!
    descuento(id: Int!): Descuento
    descuentosAplicables(monto: Float!, categoria_id: Int, tipo_item: String): [Descuento!]!

    # Turnos de Caja
    turnosAbiertos: [TurnoCaja!]!
    turnoActual(caja_id: Int!): TurnoCaja
    turnosCaja(fecha_desde: Date, fecha_hasta: Date, usuario_id: Int): [TurnoCaja!]!
    turnoCaja(id: Int!): TurnoCaja
    resumenTurnoCaja(turno_caja_id: Int!): ResumenTurnoCaja!
    detalleTurnoCaja(turno_caja_id: Int!): DetalleTurnoCaja!
    historialTurnos(
      fecha_desde: Date
      fecha_hasta: Date
      usuario_id: Int
      estado: EstadoTurnoCaja
      limit: Int
      offset: Int
    ): HistorialTurnosResponse!

    # Facturas (historial)
    facturas(
      fecha_desde: Date
      fecha_hasta: Date
      busqueda: String
      tipo_factura: String
      limite: Int
    ): [Factura!]!
    factura(id: Int!): Factura

    # Ventas POS
    ventasPOS(
      fecha_desde: Date
      fecha_hasta: Date
      turno_caja_id: Int
      tipo_cliente: TipoCliente
      estado_pago: EstadoPagoVenta
    ): [VentaPOS!]!
    ventaPOS(id: Int!): VentaPOS
    estadisticasVentasPOS(
      fecha_desde: Date
      fecha_hasta: Date
      turno_caja_id: Int
    ): EstadisticasVentasPOS!

    # Reportes POS
    topProductosVendidos(
      fecha_desde: Date!
      fecha_hasta: Date!
      limite: Int
      ordenar_por: String
    ): [ProductoMasVendido!]!
    ventasPorHora(fecha: Date!): [VentaPorHora!]!

    # ============================================================================
    # QUERIES SISTEMA DE PERMISOS
    # ============================================================================
    permisos(modulo: String, activo: Boolean): [Permiso!]!
    permisosRolAgrupados(rol: RolUsuario!): [PermisosPorModulo!]!
    permisosUsuarioAgrupados(usuario_id: Int!): [PermisosPorModulo!]!
    tienePermiso(codigo: String!): Boolean!

    # ============================================================================
    # QUERIES TRA (Tarjeta de Registro de Alojamiento - MinCIT)
    # ============================================================================
    configuracionTRA: ConfiguracionTRA
    reportesTRAPorHospedaje(hospedaje_id: Int!): [ReporteTRA!]!
    reportesTRAPendientes: [ReporteTRA!]!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  type Mutation {
    # Autenticación
    login(usuario: String!, password: String!): AuthPayload!
    loginPIN(pin: String!): AuthPayload!

    # Habitaciones
    crearHabitacion(input: CrearHabitacionInput!): Habitacion!
    actualizarHabitacion(id: Int!, input: ActualizarHabitacionInput!): Habitacion!
    cambiarEstadoHabitacion(id: Int!, estado: EstadoHabitacion!): Habitacion!
    registrarLimpieza(habitacion_id: Int!): Habitacion!
    registrarMantenimiento(habitacion_id: Int!, notas: String): Habitacion!

    # Clientes
    crearCliente(input: CrearClienteInput!): Cliente!
    actualizarCliente(id: Int!, input: CrearClienteInput!): Cliente!
    eliminarCliente(id: Int!): Boolean!

    # Huéspedes
    crearHuesped(input: CrearHuespedInput!): Huesped!
    actualizarHuesped(id: Int!, input: CrearHuespedInput!): Huesped!

    # Reservas
    crearReserva(input: CrearReservaInput!): Reserva!
    actualizarReserva(id: Int!, input: ActualizarReservaInput!): Reserva!
    confirmarReserva(id: Int!): Reserva!
    cancelarReserva(id: Int!, motivo: String): Reserva!

    # Hospedajes
    checkIn(input: CheckInInput!): Hospedaje!
    checkOut(input: CheckOutInput!): Factura!
    cancelarHospedaje(id: Int!, motivo: String!): Hospedaje!
    cambiarHabitacionHospedaje(id: Int!, nueva_habitacion_id: Int!): Hospedaje!

    # Servicios Hotel
    crearServicioHotel(input: CrearServicioHotelInput!): ServicioHotel!
    actualizarServicioHotel(id: Int!, input: ActualizarServicioHotelInput!): ServicioHotel!
    eliminarServicioHotel(id: Int!): ServicioHotel!

    # Consumos
    agregarConsumo(input: AgregarConsumoInput!): ConsumoHabitacion!
    actualizarConsumo(id: Int!, input: ActualizarConsumoInput!): ConsumoHabitacion!
    eliminarConsumo(id: Int!): ConsumoHabitacion!
    marcarConsumosFacturados(hospedaje_id: Int!): [ConsumoHabitacion!]!

    # Categorías de inventario
    crearCategoriaInventario(input: CrearCategoriaInput!): CategoriaInventario!
    actualizarCategoriaInventario(id: Int!, input: ActualizarCategoriaInput!): CategoriaInventario!
    eliminarCategoriaInventario(id: Int!): CategoriaInventario!

    # Items de inventario
    crearItemInventario(input: CrearItemInventarioInput!): ItemInventario!
    crearItemsMasivo(items: [CrearItemInventarioInput!]!): [ItemInventario!]!
    actualizarItemInventario(id: Int!, input: ActualizarItemInventarioInput!): ItemInventario!
    eliminarItemInventario(id: Int!): ItemInventario!
    ajustarStock(input: AjustarStockInput!): MovimientoInventario!

    # Configuración
    actualizarDatosHotel(input: DatosHotelInput!): DatosHotel!
    actualizarParametrosGenerales(input: ParametrosGeneralesInput!): ParametrosGenerales!

    # Tipos de Habitación Config
    crearTipoHabitacionConfig(input: TipoHabitacionConfigInput!): TipoHabitacionConfig!
    actualizarTipoHabitacionConfig(codigo: String!, input: TipoHabitacionConfigInput!): TipoHabitacionConfig!
    eliminarTipoHabitacionConfig(codigo: String!): Boolean!

    # Canales de Reserva Config
    crearCanalReservaConfig(input: CanalReservaConfigInput!): CanalReservaConfig!
    actualizarCanalReservaConfig(codigo: String!, input: CanalReservaConfigInput!): CanalReservaConfig!
    eliminarCanalReservaConfig(codigo: String!): Boolean!

    # Métodos de Pago
    crearMetodoPago(input: CrearMetodoPagoInput!): MetodoPago!
    actualizarMetodoPago(id: Int!, input: ActualizarMetodoPagoInput!): MetodoPago!
    eliminarMetodoPago(id: Int!): Boolean!

    # Notificaciones
    actualizarNotificacionesConfig(input: NotificacionesConfigInput!): NotificacionesConfig!

    # Usuarios (admin only)
    crearUsuario(input: UsuarioInput!): Usuario!
    actualizarUsuario(id: Int!, input: UsuarioInput!): Usuario!
    cambiarPasswordUsuario(id: Int!, password: String!): Boolean!
    desactivarUsuario(id: Int!): Boolean!

    # Facturación Electrónica
    actualizarConfiguracionFactus(input: ConfiguracionFactusInput!): ConfiguracionFactus!
    probarConexionFactus: ProbarConexionFactusResponse!
    crearNotaCredito(input: CrearNotaCreditoInput!): NotaCredito!

    # FactuBox - Transmisión de Facturas
    transmitirFacturaElectronica(factura_electronica_id: Int!): RespuestaTransmision!
    retransmitirFacturaRechazada(factura_electronica_id: Int!): RespuestaTransmision!
    reimprimirFactura(factura_electronica_id: Int!): RespuestaReimpresion!
    transmitirFacturasLote(factura_electronica_ids: [Int!]!): [RespuestaTransmisionLote!]!

    # FactuBox - Notas de Crédito
    crearNotaCreditoFactuBox(input: CrearNotaCreditoFactuBoxInput!): RespuestaTransmisionNC!
    transmitirNotaCredito(nota_credito_id: Int!): RespuestaTransmisionNC!

    # Consecutivos - Resoluciones DIAN
    crearResolucion(input: ResolucionDianInput!): ResolucionDian!
    actualizarResolucion(id: Int!, input: ResolucionDianInput!): ResolucionDian!
    activarResolucion(id: Int!): ResolucionDian!
    desactivarResolucion(id: Int!): ResolucionDian!

    # ============================================================================
    # MUTATIONS SISTEMA POS
    # ============================================================================

    # Descuentos
    crearDescuento(input: CrearDescuentoInput!): Descuento!
    actualizarDescuento(id: Int!, input: ActualizarDescuentoInput!): Descuento!
    eliminarDescuento(id: Int!): Boolean!

    # Turnos de Caja
    aperturaCaja(input: AbrirCajaInput!): TurnoCaja!
    cierreCaja(input: CerrarCajaInput!): TurnoCaja!
    reimprimirCierreCaja(turno_caja_id: Int!): Boolean!
    registrarRetiroCaja(input: RegistrarRetiroInput!): MovimientoCaja!

    # Ventas POS
    crearVentaPOS(input: CrearVentaPOSInput!): VentaPOS!
    anularVentaPOS(input: AnularVentaPOSInput!): VentaPOS!

    # ============================================================================
    # MUTATIONS SISTEMA DE PERMISOS
    # ============================================================================
    asignarPermisosRol(rol: RolUsuario!, permisos_ids: [Int!]!): Boolean!
    asignarPermisoUsuario(usuario_id: Int!, permiso_id: Int!, tipo_asignacion: TipoAsignacionPermiso!, motivo: String): Boolean!
    quitarPermisoUsuario(usuario_id: Int!, permiso_id: Int!): Boolean!

    # ============================================================================
    # MUTATIONS TRA (Tarjeta de Registro de Alojamiento - MinCIT)
    # ============================================================================
    actualizarConfiguracionTRA(input: ConfiguracionTRAInput!): ConfiguracionTRA!
    probarConexionTRA: ResultadoPruebaTRA!
    enviarTRA(hospedaje_id: Int!): ReporteTRA!
    reintentarTRA(reporte_id: Int!): ReporteTRA!
  }

  # ============================================================================
  # SISTEMA DE PERMISOS
  # ============================================================================

  # Tipo de asignación de permiso a usuario
  enum TipoAsignacionPermiso {
    agregar
    quitar
  }

  # Origen del permiso
  enum OrigenPermiso {
    rol
    usuario_agregado
    usuario_quitado
    sin_permiso
  }

  # Permiso del catálogo
  type Permiso {
    id: ID!
    codigo: String!
    nombre: String!
    descripcion: String
    modulo: String!
    categoria: String!
    orden: Int!
    activo: Boolean!
    created_at: DateTime
  }

  # Permiso con estado de asignación (para UI)
  type PermisoConEstado {
    id: ID!
    codigo: String!
    nombre: String!
    descripcion: String
    modulo: String!
    categoria: String!
    asignado: Boolean!
    origen: OrigenPermiso!
    editable: Boolean!
  }

  # Grupo de permisos por módulo (para UI)
  type PermisosPorModulo {
    modulo: String!
    permisos: [PermisoConEstado!]!
  }

  # Extender Usuario para incluir permisos efectivos
  extend type Usuario {
    permisos_efectivos: [String!]
  }

  # ============================================================================
  # TRA - TARJETA DE REGISTRO DE ALOJAMIENTO (MinCIT Colombia)
  # ============================================================================

  type ConfiguracionTRA {
    id: Int!
    token: String
    rnt: String
    nombre_establecimiento: String
    tipo_acomodacion: String
    endpoint: String!
    activo: Boolean!
    ultimo_envio_exitoso: DateTime
    total_envios_exitosos: Int!
    total_envios_fallidos: Int!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type ReporteTRA {
    id: Int!
    hospedaje_id: Int!
    huesped_id: Int!
    estado: String!
    fecha_envio: DateTime
    codigo_confirmacion: String
    code_principal: Int
    errores: String
    intentos: Int!
    datos_enviados: JSON
    respuesta_api: JSON
    enviado_por: Int
    created_at: DateTime!
    updated_at: DateTime!
    hospedaje: Hospedaje
    huesped: Huesped
  }

  input ConfiguracionTRAInput {
    token: String
    rnt: String
    nombre_establecimiento: String
    tipo_acomodacion: String
    endpoint: String
    activo: Boolean
  }

  type ResultadoPruebaTRA {
    success: Boolean!
    message: String!
    data: JSON
  }
`;

module.exports = typeDefs;
