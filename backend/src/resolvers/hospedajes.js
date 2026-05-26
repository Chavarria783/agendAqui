// FactusService removido - proyecto universitario
// const FactusService = require('../services/FactusService');
const { obtenerSiguienteNumero } = require('./consecutivos');
const { agregarFacturaACola, construirDatosFactura } = require('../services/cola-impresion');

const hospedajesResolvers = {
  Hospedaje: {
    habitacion: async (parent, _, { pool }) => {
      if (!parent.habitacion_id) return null;
      try {
        const result = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1',
          [parent.habitacion_id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener habitación de hospedaje:', error);
        return null;
      }
    },

    huesped: async (parent, _, { pool }) => {
      if (!parent.huesped_id) return null;
      try {
        const result = await pool.query(
          'SELECT * FROM huespedes WHERE id = $1',
          [parent.huesped_id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener huésped de hospedaje:', error);
        return null;
      }
    },

    reserva: async (parent, _, { pool }) => {
      if (!parent.reserva_id) return null;
      try {
        const result = await pool.query(
          'SELECT * FROM reservas WHERE id = $1',
          [parent.reserva_id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener reserva de hospedaje:', error);
        return null;
      }
    },
  },

  Query: {
    /**
     * Obtener todos los hospedajes con filtros opcionales
     * @param {String} estado - Filtro por estado (activo, finalizado, cancelado)
     * @returns {Array} Lista de hospedajes
     */
    hospedajes: async (_, { estado }, { pool }) => {
      try {
        let query = 'SELECT * FROM hospedajes WHERE 1=1';
        const params = [];

        if (estado) {
          params.push(estado);
          query += ` AND estado = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error en hospedajes query:', error);
        throw new Error('Error al obtener hospedajes');
      }
    },

    /**
     * Obtener un hospedaje por ID
     * @param {Number} id - ID del hospedaje
     * @returns {Object} Hospedaje
     */
    hospedaje: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM hospedajes WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error('Hospedaje no encontrado');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en hospedaje query:', error);
        throw error;
      }
    },

    /**
     * Obtener un hospedaje por código
     * @param {String} codigo - Código del hospedaje
     * @returns {Object} Hospedaje
     */
    hospedajePorCodigo: async (_, { codigo }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM hospedajes WHERE codigo = $1',
          [codigo]
        );

        if (result.rows.length === 0) {
          throw new Error('Hospedaje no encontrado');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en hospedajePorCodigo query:', error);
        throw error;
      }
    },

    /**
     * Obtener todos los hospedajes activos
     * @returns {Array} Lista de hospedajes activos
     */
    hospedajesActivos: async (_, __, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM hospedajes WHERE estado = $1 ORDER BY fecha_entrada DESC',
          ['activo']
        );

        return result.rows;
      } catch (error) {
        console.error('Error en hospedajesActivos query:', error);
        throw new Error('Error al obtener hospedajes activos');
      }
    },

    /**
     * Obtener cuenta corriente de un hospedaje (con todos los consumos)
     * @param {Number} hospedaje_id - ID del hospedaje
     * @returns {Object} Desglose de la cuenta
     */
    cuentaHospedaje: async (_, { hospedaje_id, fecha_salida }, { pool }) => {
      try {
        // Obtener hospedaje
        const hospedaje = await pool.query(
          'SELECT * FROM hospedajes WHERE id = $1',
          [hospedaje_id]
        );

        if (hospedaje.rows.length === 0) {
          throw new Error('Hospedaje no encontrado');
        }

        const hosp = hospedaje.rows[0];

        // Calcular noches usando fecha_salida proporcionada, o fecha_salida_real, o fecha actual
        const fechaSalidaCalculo = fecha_salida
          ? new Date(fecha_salida)
          : (hosp.fecha_salida_real || new Date());

        const noches = Math.ceil(
          (fechaSalidaCalculo - new Date(hosp.fecha_entrada)) / (1000 * 60 * 60 * 24)
        );

        // Calcular subtotal de hospedaje
        const subtotalHospedaje = noches * parseFloat(hosp.precio_noche);

        // Obtener consumos
        const consumos = await pool.query(
          `SELECT c.*,
                  COALESCE(i.nombre, s.nombre, c.descripcion) as item_nombre,
                  COALESCE(i.tipo, 'servicio') as categoria
           FROM consumos_habitacion c
           LEFT JOIN items_inventario i ON c.item_inventario_id = i.id
           LEFT JOIN servicios_hotel s ON c.servicio_id = s.id
           WHERE c.hospedaje_id = $1
           ORDER BY c.fecha_consumo DESC`,
          [hospedaje_id]
        );

        // Calcular subtotal de consumos
        const subtotalConsumos = consumos.rows.reduce(
          (sum, c) => sum + parseFloat(c.precio_total),
          0
        );

        // Total general
        const total = subtotalHospedaje + subtotalConsumos;

        return {
          hospedaje_id: hosp.id,
          codigo: hosp.codigo,
          noches,
          precio_noche: parseFloat(hosp.precio_noche),
          subtotal_hospedaje: subtotalHospedaje,
          consumos: consumos.rows,
          subtotal_consumos: subtotalConsumos,
          total,
          pagado: parseFloat(hosp.monto_anticipo) || 0,
          saldo: total - (parseFloat(hosp.monto_anticipo) || 0),
        };
      } catch (error) {
        console.error('Error en cuentaHospedaje query:', error);
        throw error;
      }
    },
  },

  Mutation: {
    /**
     * Realizar check-in (desde reserva o walk-in)
     * @param {Object} input - Datos del check-in
     * @returns {Object} Hospedaje creado
     */
    checkIn: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 1. Validar habitación
        const habitacion = await client.query(
          'SELECT * FROM habitaciones WHERE id = $1 AND activa = true',
          [input.habitacion_id]
        );

        if (habitacion.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        if (habitacion.rows[0].estado === 'ocupada') {
          throw new Error('La habitación ya está ocupada');
        }

        // 2. Validar huésped
        const huesped = await client.query(
          'SELECT * FROM huespedes WHERE id = $1',
          [input.huesped_id]
        );

        if (huesped.rows.length === 0) {
          throw new Error('Huésped no encontrado');
        }

        // VALIDACIÓN CRÍTICA: Validar fecha de check-in
        const fechaEntrada = new Date(input.fecha_entrada || new Date());
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaEntradaSinHora = new Date(fechaEntrada);
        fechaEntradaSinHora.setHours(0, 0, 0, 0);

        // Permitir check-in de hoy o máximo 1 día en el futuro (para early check-in)
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);

        if (fechaEntradaSinHora > manana) {
          throw new Error('La fecha de check-in no puede ser más de 1 día en el futuro');
        }

        // VALIDACIÓN CRÍTICA: Validar capacidad de la habitación con acompañantes
        const numAcompanantes = input.acompanantes ? input.acompanantes.length : 0;
        const totalOcupantes = 1 + numAcompanantes; // 1 (huésped principal) + acompañantes

        if (totalOcupantes > habitacion.rows[0].capacidad) {
          throw new Error(`La habitación tiene capacidad para ${habitacion.rows[0].capacidad} persona(s), pero se intentan hospedar ${totalOcupantes} persona(s)`);
        }

        // 3. Si viene de una reserva, validarla
        let reserva = null;
        let precioNoche = parseFloat(habitacion.rows[0].precio_noche);
        let anticipo = 0;

        if (input.reserva_id) {
          const reservaResult = await client.query(
            'SELECT * FROM reservas WHERE id = $1 FOR UPDATE',
            [input.reserva_id]
          );

          if (reservaResult.rows.length === 0) {
            throw new Error('Reserva no encontrada');
          }

          reserva = reservaResult.rows[0];

          // Validar que la reserva es para esta habitación y huésped
          if (parseInt(reserva.habitacion_id) !== parseInt(input.habitacion_id)) {
            throw new Error('La reserva no es para esta habitación');
          }

          if (parseInt(reserva.huesped_id) !== parseInt(input.huesped_id)) {
            throw new Error('La reserva no es para este huésped');
          }

          if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
            throw new Error('La reserva no está en estado válido para check-in');
          }

          // Usar precio y anticipo de la reserva
          precioNoche = parseFloat(reserva.precio_noche);
          anticipo = parseFloat(reserva.anticipo) || 0;

          // Actualizar estado de reserva a 'en_curso'
          await client.query(
            'UPDATE reservas SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['en_curso', input.reserva_id]
          );
        }

        // 4. Calcular noches previstas
        const fechaSalidaPrevista = new Date(input.fecha_salida_prevista);

        if (isNaN(fechaSalidaPrevista.getTime())) {
          throw new Error('Fecha de salida prevista inválida');
        }

        // VALIDACIÓN CRÍTICA: Validar que check-out > check-in
        if (fechaSalidaPrevista <= fechaEntrada) {
          throw new Error('La fecha de salida debe ser posterior a la fecha de entrada');
        }
        const nochesPrevistas = Math.ceil(
          (fechaSalidaPrevista - fechaEntrada) / (1000 * 60 * 60 * 24)
        );

        // 5. Crear hospedaje
        const precioTotalHospedaje = nochesPrevistas * precioNoche;
        const hospedajeResult = await client.query(
          `INSERT INTO hospedajes (
            codigo, habitacion_id, huesped_id, reserva_id,
            fecha_entrada, fecha_salida_prevista, noches_previstas,
            precio_noche, precio_total_hospedaje, monto_anticipo,
            acompanantes, observaciones,
            estado, created_by
          ) VALUES (
            'HOS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
              LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 15) AS INTEGER)), 0) + 1
                    FROM hospedajes
                    WHERE codigo LIKE 'HOS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%')::TEXT, 4, '0'),
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'activo', $12
          ) RETURNING *`,
          [
            input.habitacion_id,
            input.huesped_id,
            input.reserva_id || null,
            input.fecha_entrada || new Date(),
            input.fecha_salida_prevista,
            nochesPrevistas,
            precioNoche,
            precioTotalHospedaje,
            anticipo,
            JSON.stringify(input.acompanantes || []),
            input.observaciones || null,
            user.id,
          ]
        );

        // 6. Actualizar estado de habitación a 'ocupada'
        await client.query(
          'UPDATE habitaciones SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['ocupada', input.habitacion_id]
        );

        await client.query('COMMIT');

        const hospedaje = hospedajeResult.rows[0];

        // =====================================================================
        // TRA - Envío a MinCIT (si está activo) - NO BLOQUEANTE
        // API Resolución 409: POST /one/ (principal) + POST /two/ (acompañantes)
        // Nunca debe bloquear el check-in, por eso es fire-and-forget
        // =====================================================================
        try {
          const traConfig = await pool.query('SELECT activo FROM configuracion_tra WHERE id = 1');

          if (traConfig.rows.length > 0 && traConfig.rows[0].activo) {
            console.log('[CheckIn] TRA activo, preparando envío...');

            // Obtener datos del huésped (nombre y apellido separados para API TRA)
            const huespedTRA = await pool.query(
              `SELECT h.*, CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as nombre_completo
               FROM huespedes h
               JOIN clientes c ON c.id = h.cliente_id
               WHERE h.id = $1`,
              [input.huesped_id]
            );

            // Obtener número de habitación (necesario para payload TRA)
            const habitacionTRA = await pool.query(
              'SELECT numero FROM habitaciones WHERE id = $1',
              [input.habitacion_id]
            );

            if (huespedTRA.rows.length > 0) {
              // Agregar número de habitación al objeto hospedaje
              const hospedajeConHab = {
                ...hospedaje,
                habitacion_numero: habitacionTRA.rows[0]?.numero || ''
              };

              // Parsear acompañantes
              let acompanantes = [];
              try {
                acompanantes = typeof input.acompanantes === 'string'
                  ? JSON.parse(input.acompanantes)
                  : (input.acompanantes || []);
              } catch { acompanantes = []; }

              // Crear registro pendiente en reportes_tra
              await pool.query(
                `INSERT INTO reportes_tra (hospedaje_id, huesped_id, estado, enviado_por)
                 VALUES ($1, $2, 'pendiente', $3)
                 ON CONFLICT (hospedaje_id, huesped_id) DO NOTHING`,
                [hospedaje.id, input.huesped_id, user.id]
              );

              // Fire-and-forget: envío asíncrono al TRA (dos pasos: /one/ + /two/)
              const TRAService = require('../services/TRAService');
              TRAService.enviarRegistro(hospedajeConHab, huespedTRA.rows[0], acompanantes)
                .then(async (resultado) => {
                  const config = await TRAService.getConfig();
                  const payloadPrincipal = TRAService.construirPayloadPrincipal(
                    hospedajeConHab, huespedTRA.rows[0], acompanantes.length, config
                  );
                  await pool.query(
                    `UPDATE reportes_tra
                     SET estado = 'enviado', fecha_envio = CURRENT_TIMESTAMP,
                         codigo_confirmacion = $1, code_principal = $2,
                         respuesta_api = $3, datos_enviados = $4,
                         intentos = intentos + 1, errores = NULL
                     WHERE hospedaje_id = $5 AND huesped_id = $6`,
                    [String(resultado.code_principal || ''), resultado.code_principal,
                     JSON.stringify(resultado), JSON.stringify(payloadPrincipal),
                     hospedaje.id, input.huesped_id]
                  );
                  await pool.query(
                    `UPDATE hospedajes SET tra_estado = 'enviado' WHERE id = $1`,
                    [hospedaje.id]
                  );
                  console.log('[TRA] Registro enviado exitosamente para hospedaje:', hospedaje.id, 'code:', resultado.code_principal);
                })
                .catch(async (err) => {
                  console.error('[TRA] Error al enviar registro:', err.message);
                  await pool.query(
                    `UPDATE reportes_tra
                     SET estado = 'error', errores = $1, intentos = intentos + 1
                     WHERE hospedaje_id = $2 AND huesped_id = $3`,
                    [err.message, hospedaje.id, input.huesped_id]
                  );
                  await pool.query(
                    `UPDATE hospedajes SET tra_estado = 'error' WHERE id = $1`,
                    [hospedaje.id]
                  );
                });
            }
          } else {
            // TRA no configurado
            await pool.query(
              `UPDATE hospedajes SET tra_estado = 'no_configurado' WHERE id = $1`,
              [hospedaje.id]
            );
          }
        } catch (traError) {
          // NUNCA bloquear el check-in por errores de TRA
          console.error('[TRA] Error no-bloqueante en checkIn:', traError.message);
          try {
            await pool.query(
              `UPDATE hospedajes SET tra_estado = 'error' WHERE id = $1`,
              [hospedaje.id]
            );
          } catch { /* ignore */ }
        }

        return hospedaje;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en checkIn mutation:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    /**
     * Realizar check-out y generar factura
     * @param {Object} input - Datos del check-out
     * @returns {Object} Factura generada
     */
    checkOut: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 1. Obtener hospedaje (FOR UPDATE previene checkout doble concurrente)
        const hospedaje = await client.query(
          'SELECT * FROM hospedajes WHERE id = $1 FOR UPDATE',
          [input.hospedaje_id]
        );

        if (hospedaje.rows.length === 0) {
          throw new Error('Hospedaje no encontrado');
        }

        const hosp = hospedaje.rows[0];

        if (hosp.estado !== 'activo') {
          if (hosp.estado === 'finalizado') {
            const fechaCheckout = hosp.checked_out_at ? new Date(hosp.checked_out_at).toLocaleDateString('es-CO') : 'fecha desconocida';
            throw new Error(`Este hospedaje ya fue finalizado el ${fechaCheckout}. No se puede realizar checkout nuevamente.`);
          } else if (hosp.estado === 'cancelado') {
            throw new Error('Este hospedaje fue cancelado y no se puede realizar checkout.');
          } else {
            throw new Error(`El hospedaje tiene estado '${hosp.estado}' y no puede ser procesado.`);
          }
        }

        // VALIDACIONES DIAN: Verificar que el cliente tenga los campos obligatorios para facturación electrónica
        const clienteResult = await client.query(
          `SELECT c.*,
                  CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as huesped_nombre
           FROM huespedes h
           JOIN clientes c ON h.cliente_id = c.id
           WHERE h.id = $1`,
          [hosp.huesped_id]
        );

        if (clienteResult.rows.length === 0) {
          throw new Error('No se encontró el cliente asociado al huésped principal.');
        }

        const clienteData = clienteResult.rows[0];

        // Validaciones DIAN omitidas - no requeridas para este sprint

        // 2. Calcular noches reales
        const fechaSalidaReal = input.fecha_salida_real || new Date();
        const fechaEntrada = new Date(hosp.fecha_entrada);
        const fechaSalida = new Date(fechaSalidaReal);

        // VALIDACIÓN CRÍTICA: Validar que fecha de salida > fecha de entrada
        if (fechaSalida <= fechaEntrada) {
          throw new Error('La fecha de salida debe ser posterior a la fecha de entrada. Por favor, seleccione una fecha y hora futuras.');
        }

        const nochesReales = Math.ceil(
          (fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24)
        );

        // VALIDACIÓN CRÍTICA: Validar que al menos haya 1 noche
        if (nochesReales < 1) {
          const horasEstadia = Math.round((fechaSalida - fechaEntrada) / (1000 * 60 * 60));
          throw new Error(
            `El hospedaje debe ser de al menos 1 noche completa (24 horas). ` +
            `Estadía actual: ${horasEstadia} horas. ` +
            `Por favor, seleccione una fecha de salida para mañana o posterior.`
          );
        }

        // 3. Calcular subtotal de hospedaje
        const subtotalHospedaje = nochesReales * parseFloat(hosp.precio_noche);

        // 4. Obtener consumos no facturados
        const consumos = await client.query(
          'SELECT * FROM consumos_habitacion WHERE hospedaje_id = $1 AND facturado = false',
          [input.hospedaje_id]
        );

        const subtotalConsumos = consumos.rows.reduce(
          (sum, c) => sum + parseFloat(c.precio_total),
          0
        );

        // 5. Total general
        const total = subtotalHospedaje + subtotalConsumos;

        // 6. Validar que los métodos de pago cubran el total
        const totalPagado = input.metodos_pago.reduce((sum, mp) => sum + mp.monto, 0);

        if (Math.abs(totalPagado - total) > 0.01) {
          throw new Error(`El total pagado (${totalPagado}) no coincide con el total de la cuenta (${total})`);
        }

        // 7. Obtener número de factura de resolución DIAN activa
        const { prefijo: prefijo_resolucion, numero: numero_solo, numeroFormateado: numero_factura } = await obtenerSiguienteNumero(client, 'factura');

        // 8. Crear factura
        const facturaResult = await client.query(
          `INSERT INTO facturas (
            numero_factura, fecha, subtotal, iva, descuento, total,
            cliente_id, hospedaje_id, observaciones, created_by
          ) VALUES (
            $1,
            CURRENT_TIMESTAMP, $2, $3, $4, $5,
            (SELECT cliente_id FROM huespedes WHERE id = $6),
            $7, $8, $9
          ) RETURNING *`,
          [
            numero_solo,
            total,
            input.impuestos || 0,
            input.descuento || 0,
            total,
            hosp.huesped_id,
            input.hospedaje_id,
            input.observaciones || null,
            user.id,
          ]
        );

        const factura = facturaResult.rows[0];

        // 9. Registrar métodos de pago
        for (const mp of input.metodos_pago) {
          await client.query(
            `INSERT INTO factura_metodos_pago (factura_id, metodo_pago_id, monto, referencia)
             VALUES ($1, $2, $3, $4)`,
            [factura.id, mp.metodo_pago_id, mp.monto, mp.referencia || null]
          );
        }

        // 10. Marcar consumos como facturados
        await client.query(
          'UPDATE consumos_habitacion SET facturado = true WHERE hospedaje_id = $1',
          [input.hospedaje_id]
        );

        // 11. Actualizar hospedaje
        await client.query(
          `UPDATE hospedajes SET
             fecha_salida_real = $1,
             noches_reales = $2,
             estado = 'finalizado',
             checked_out_by = $3,
             checked_out_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [fechaSalidaReal, nochesReales, user.id, input.hospedaje_id]
        );

        // 12. Actualizar habitación a estado 'limpieza'
        await client.query(
          'UPDATE habitaciones SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['limpieza', hosp.habitacion_id]
        );

        // 13. Si había reserva, marcar como finalizada
        if (hosp.reserva_id) {
          await client.query(
            'UPDATE reservas SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['finalizada', hosp.reserva_id]
          );
        }

        await client.query('COMMIT');

        // =====================================================================
        // 13. FACTURACIÓN ELECTRÓNICA - Envío a Factus (si está activo)
        // =====================================================================
        try {
          // Verificar si Factus está activo
          const configFactus = await pool.query(
            'SELECT activo FROM configuracion_factus WHERE id = 1'
          );

          if (configFactus.rows.length > 0 && configFactus.rows[0].activo) {
            console.log('[CheckOut] Facturación electrónica activa, enviando a Factus...');

            // Obtener datos completos del cliente
            const clienteResult = await pool.query(
              `SELECT c.*, h.numero_documento, h.tipo_documento_dian
               FROM huespedes h
               JOIN clientes c ON h.cliente_id = c.id
               WHERE h.id = $1`,
              [hosp.huesped_id]
            );

            if (clienteResult.rows.length === 0) {
              console.warn('[CheckOut] No se encontró cliente/huésped, omitiendo factura electrónica');
            } else {
              const cliente = clienteResult.rows[0];

              // Obtener habitación (para incluir en descripción)
              const habitacionResult = await pool.query(
                'SELECT numero FROM habitaciones WHERE id = $1',
                [hosp.habitacion_id]
              );

              const habitacionNumero = habitacionResult.rows[0]?.numero || 'N/A';

              // Preparar datos del hospedaje con número de habitación
              const hospedajeConHabitacion = {
                ...hosp,
                habitacion_numero: habitacionNumero,
                noches_reales: nochesReales,
              };

              // Obtener nombres de métodos de pago para Factus
              const metodosPagoNombresResult = await pool.query(
                'SELECT id, nombre FROM metodos_pago WHERE id = ANY($1::int[])',
                [input.metodos_pago.map(m => m.metodo_pago_id)]
              );
              const nombresMap = {};
              metodosPagoNombresResult.rows.forEach(mp => { nombresMap[mp.id] = mp.nombre; });
              const metodosPagoParaFactus = input.metodos_pago.map(mp => ({
                metodo: nombresMap[mp.metodo_pago_id] || 'efectivo',
                monto: mp.monto
              }));

              // FactusService removido - proyecto universitario
              if (typeof FactusService === 'undefined') {
                console.warn('[CheckOut] FactusService no disponible, omitiendo factura electrónica');
              } else {
                const respuestaFactus = await FactusService.enviarFacturaHospedaje(
                hospedajeConHabitacion,
                factura,
                consumos.rows,
                cliente,
                metodosPagoParaFactus
              );

              console.log('[CheckOut] Respuesta de Factus recibida:', JSON.stringify(respuestaFactus, null, 2));

              // Extraer datos de la respuesta de Factus
              const billData = respuestaFactus.data?.bill || respuestaFactus;
              // El número de factura ya viene con el prefijo incluido (ej: "SETP990019300")
              const billNumber = billData?.number || null;
              // El prefijo viene en numbering_range
              const billPrefix = respuestaFactus.data?.numbering_range?.prefix || null;

              // Extraer solo dígitos del número para la columna bigint
              // El número viene como "SETP990019300", extraemos solo los dígitos
              let numeroSoloDigitos = null;
              if (billNumber) {
                const digitsOnly = billNumber.toString().replace(/\D/g, '');
                numeroSoloDigitos = digitsOnly ? parseInt(digitsOnly, 10) : null;
              }

              // El número de factura electrónica ya viene completo con prefijo
              const numeroFacturaElectronica = billNumber;

              console.log('[CheckOut] Bill number (completo con prefijo):', billNumber);
              console.log('[CheckOut] Prefijo:', billPrefix);
              console.log('[CheckOut] Numero solo digitos para BD:', numeroSoloDigitos);
              console.log('[CheckOut] Numero factura electronica:', numeroFacturaElectronica);

              // Actualizar factura local con número asignado por Factus
              if (billNumber) {
                // Extraer solo el número (sin prefijo) del billNumber
                let numeroFactus = billNumber;
                if (billPrefix && billNumber.startsWith(billPrefix)) {
                  numeroFactus = billNumber.substring(billPrefix.length);
                }
                await pool.query(
                  `UPDATE facturas SET numero_factura = $1, prefijo = COALESCE($2, prefijo) WHERE id = $3`,
                  [numeroFactus, billPrefix, factura.id]
                );
                console.log('[CheckOut] Factura actualizada con número de Factus:', billPrefix, numeroFactus);
              }

              // Calcular subtotales para la factura electrónica
              const subtotalHospedaje = parseFloat(hospedajeConHabitacion.precio_noche) * parseInt(hospedajeConHabitacion.noches_reales || 1);
              const subtotalConsumos = consumos.rows.reduce((sum, c) => sum + parseFloat(c.precio_total || 0), 0);
              const subtotalTotal = subtotalHospedaje + subtotalConsumos;
              const totalFactura = parseFloat(factura.total) || subtotalTotal;

              // Obtener IVA real desde configuración de Factus
              const configIva = await pool.query(
                'SELECT iva_hospedaje, iva_consumos FROM configuracion_factus WHERE id = 1'
              );
              const ivaHospedaje = parseFloat(configIva.rows[0]?.iva_hospedaje || 0);
              const ivaConsumos = parseFloat(configIva.rows[0]?.iva_consumos || 19);

              // Construir arrays JSON para items_hospedaje, items_consumos y metodos_pago
              const itemsHospedaje = [{
                descripcion: `Hospedaje Habitación ${habitacionNumero}`,
                habitacion: habitacionNumero,
                noches: hospedajeConHabitacion.noches_reales || nochesReales,
                precio_unitario: parseFloat(hospedajeConHabitacion.precio_noche),
                cantidad: hospedajeConHabitacion.noches_reales || nochesReales,
                total: subtotalHospedaje,
                tarifa_iva: ivaHospedaje
              }];

              const itemsConsumos = consumos.rows.map(c => ({
                descripcion: c.descripcion || 'Consumo',
                cantidad: parseInt(c.cantidad || 1),
                precio_unitario: parseFloat(c.precio_unitario || 0),
                total: parseFloat(c.precio_total || 0),
                tarifa_iva: parseFloat(c.iva || ivaConsumos)
              }));

              // Obtener nombres de métodos de pago
              const metodosPagoData = await pool.query(
                `SELECT id, nombre FROM metodos_pago WHERE id = ANY($1::int[])`,
                [input.metodos_pago.map(mp => mp.metodo_pago_id)]
              );

              const metodosPagoMap = {};
              metodosPagoData.rows.forEach(mp => {
                metodosPagoMap[mp.id] = mp.nombre;
              });

              const metodosPago = input.metodos_pago.map(mp => ({
                metodo: metodosPagoMap[mp.metodo_pago_id] || 'Desconocido',
                metodo_pago_id: mp.metodo_pago_id,
                monto: parseFloat(mp.monto),
                referencia: mp.referencia || null
              }));

              // Guardar factura electrónica en BD (usando columnas correctas de la tabla)
              await pool.query(
                `INSERT INTO facturas_electronicas (
                  factura_id,
                  hospedaje_id,
                  factus_id,
                  cufe,
                  numero_factura_electronica,
                  numero_factus,
                  prefijo,
                  numero,
                  pdf_url,
                  xml_url,
                  public_url,
                  factus_status,
                  fecha_emision,
                  fecha_envio_factus,
                  cliente_id,
                  cliente_tipo_documento,
                  cliente_numero_documento,
                  cliente_nombre,
                  cliente_email,
                  cliente_telefono,
                  cliente_direccion,
                  subtotal_hospedaje,
                  subtotal_consumos,
                  subtotal,
                  total,
                  items_hospedaje,
                  items_consumos,
                  metodos_pago,
                  factus_response,
                  created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, CURRENT_TIMESTAMP)
                ON CONFLICT (factura_id) DO UPDATE SET
                  hospedaje_id = EXCLUDED.hospedaje_id,
                  factus_id = EXCLUDED.factus_id,
                  cufe = EXCLUDED.cufe,
                  numero_factura_electronica = EXCLUDED.numero_factura_electronica,
                  numero_factus = EXCLUDED.numero_factus,
                  prefijo = EXCLUDED.prefijo,
                  numero = EXCLUDED.numero,
                  pdf_url = EXCLUDED.pdf_url,
                  xml_url = EXCLUDED.xml_url,
                  public_url = EXCLUDED.public_url,
                  factus_status = EXCLUDED.factus_status,
                  fecha_emision = EXCLUDED.fecha_emision,
                  fecha_envio_factus = EXCLUDED.fecha_envio_factus,
                  subtotal_hospedaje = EXCLUDED.subtotal_hospedaje,
                  subtotal_consumos = EXCLUDED.subtotal_consumos,
                  subtotal = EXCLUDED.subtotal,
                  total = EXCLUDED.total,
                  items_hospedaje = EXCLUDED.items_hospedaje,
                  items_consumos = EXCLUDED.items_consumos,
                  metodos_pago = EXCLUDED.metodos_pago,
                  factus_response = EXCLUDED.factus_response,
                  error_message = NULL`,
                [
                  factura.id,
                  hospedajeConHabitacion.id,
                  billData?.id?.toString() || null,
                  billData?.cufe || null,
                  numeroFacturaElectronica,
                  billNumber || null, // numero_factus - número completo de Factus para reconciliación
                  billPrefix,
                  numeroSoloDigitos,
                  // Generar URLs de PDF y XML basadas en public_url
                  billData?.public_url ? `${billData.public_url}/pdf` : null,
                  billData?.public_url ? `${billData.public_url}/xml` : null,
                  billData?.public_url || null,
                  respuestaFactus.status || 'Created',
                  new Date(),
                  new Date(),
                  cliente.id || null,
                  cliente.tipo_documento || 'CC',
                  cliente.numero_documento || huesped?.numero_documento || null,
                  cliente.nombre ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : null,
                  cliente.email || null,
                  cliente.telefono || null,
                  cliente.direccion || null,
                  subtotalHospedaje,
                  subtotalConsumos,
                  subtotalTotal,
                  totalFactura,
                  JSON.stringify(itemsHospedaje),
                  JSON.stringify(itemsConsumos),
                  JSON.stringify(metodosPago),
                  JSON.stringify(respuestaFactus),
                ]
              );

              // Marcar factura como electrónica
              await pool.query(
                'UPDATE facturas SET tiene_factura_electronica = true WHERE id = $1',
                [factura.id]
              );

              console.log('[CheckOut] Factura electrónica guardada exitosamente');
              console.log(`[CheckOut] CUFE: ${respuestaFactus.cufe}`);
              console.log(`[CheckOut] PDF: ${billData?.public_url}/pdf`);
              } // cierre else FactusService
            }
          } else {
            console.log('[CheckOut] Facturación electrónica desactivada, omitiendo envío a Factus');
          }
        } catch (errorFactus) {
          // No fallar el checkout si falla Factus, solo registrar error en logs
          console.error('[CheckOut] Error al enviar factura electrónica a Factus:', errorFactus.message);
          console.error('[CheckOut] El checkout se completó pero la factura electrónica no se generó');
          console.error('[CheckOut] Stack:', errorFactus.stack);

          // =====================================================================
          // GUARDAR FACTURA PENDIENTE PARA MOSTRAR EN FACTUBOX
          // =====================================================================
          try {
            // Obtener datos del cliente para guardar en la factura pendiente
            const clienteResult = await pool.query(
              `SELECT c.*, h.numero_documento as huesped_documento, h.tipo_documento_dian
               FROM huespedes h
               LEFT JOIN clientes c ON h.cliente_id = c.id
               WHERE h.id = $1`,
              [hosp.huesped_id]
            );

            const cliente = clienteResult.rows[0] || {};

            // Calcular subtotales para la factura pendiente
            const subtotalHospedajePendiente = parseFloat(hosp.precio_noche) * parseInt(nochesReales || 1);
            const subtotalConsumosPendiente = consumos.rows.reduce((sum, c) => sum + parseFloat(c.precio_total || 0), 0);
            const subtotalTotal = subtotalHospedajePendiente + subtotalConsumosPendiente;
            const totalFactura = parseFloat(factura.total) || subtotalTotal;

            // Obtener número de habitación para el pendiente también
            const habitacionResult = await pool.query(
              'SELECT numero FROM habitaciones WHERE id = $1',
              [hosp.habitacion_id]
            );
            const numeroHabitacion = habitacionResult.rows[0]?.numero || 'N/A';

            // Construir arrays JSON para items (igual que el caso exitoso)
            const itemsHospedajePendiente = [{
              descripcion: `Hospedaje Habitación ${numeroHabitacion}`,
              habitacion: numeroHabitacion,
              noches: nochesReales,
              precio_unitario: parseFloat(hosp.precio_noche),
              cantidad: nochesReales,
              total: subtotalHospedajePendiente,
              tarifa_iva: 0
            }];

            const itemsConsumosPendiente = consumos.rows.map(c => ({
              descripcion: c.descripcion || 'Consumo',
              cantidad: parseInt(c.cantidad || 1),
              precio_unitario: parseFloat(c.precio_unitario || 0),
              total: parseFloat(c.precio_total || 0),
              tarifa_iva: 19
            }));

            // Obtener métodos de pago (desde input original)
            const metodosPagoDataPendiente = await pool.query(
              `SELECT id, nombre FROM metodos_pago WHERE id = ANY($1::int[])`,
              [input.metodos_pago.map(mp => mp.metodo_pago_id)]
            );

            const metodosPagoMapPendiente = {};
            metodosPagoDataPendiente.rows.forEach(mp => {
              metodosPagoMapPendiente[mp.id] = mp.nombre;
            });

            const metodosPagoPendiente = input.metodos_pago.map(mp => ({
              metodo: metodosPagoMapPendiente[mp.metodo_pago_id] || 'Desconocido',
              metodo_pago_id: mp.metodo_pago_id,
              monto: parseFloat(mp.monto),
              referencia: mp.referencia || null
            }));

            // Guardar factura con estado "Pendiente" para que aparezca en FactuBox
            await pool.query(
              `INSERT INTO facturas_electronicas (
                factura_id,
                hospedaje_id,
                factus_id,
                cufe,
                numero_factura_electronica,
                prefijo,
                numero,
                pdf_url,
                xml_url,
                public_url,
                factus_status,
                fecha_emision,
                cliente_id,
                cliente_tipo_documento,
                cliente_numero_documento,
                cliente_nombre,
                cliente_email,
                cliente_telefono,
                cliente_direccion,
                subtotal_hospedaje,
                subtotal_consumos,
                subtotal,
                total,
                items_hospedaje,
                items_consumos,
                metodos_pago,
                error_message,
                created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, CURRENT_TIMESTAMP)
              ON CONFLICT (factura_id) DO UPDATE SET
                hospedaje_id = EXCLUDED.hospedaje_id,
                factus_status = EXCLUDED.factus_status,
                error_message = EXCLUDED.error_message,
                subtotal_hospedaje = EXCLUDED.subtotal_hospedaje,
                subtotal_consumos = EXCLUDED.subtotal_consumos,
                subtotal = EXCLUDED.subtotal,
                total = EXCLUDED.total,
                items_hospedaje = EXCLUDED.items_hospedaje,
                items_consumos = EXCLUDED.items_consumos,
                metodos_pago = EXCLUDED.metodos_pago`,
              [
                factura.id,
                hosp.id,
                null, // factus_id - no disponible
                null, // cufe - no disponible
                null, // numero_factura_electronica - no disponible
                null, // prefijo - no disponible
                null, // numero - no disponible
                null, // pdf_url - no disponible
                null, // xml_url - no disponible
                null, // public_url - no disponible
                'Pendiente', // factus_status - marca como pendiente
                new Date(),
                cliente.id || null,
                cliente.tipo_documento || 'CC',
                cliente.numero_documento || cliente.huesped_documento || null,
                cliente.nombre ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : null,
                cliente.email || null,
                cliente.telefono || null,
                cliente.direccion || null,
                subtotalHospedajePendiente,
                subtotalConsumosPendiente,
                subtotalTotal,
                totalFactura,
                JSON.stringify(itemsHospedajePendiente),
                JSON.stringify(itemsConsumosPendiente),
                JSON.stringify(metodosPagoPendiente),
                errorFactus.message // Guardar mensaje de error
              ]
            );

            console.log('[CheckOut] Factura guardada como PENDIENTE en facturas_electronicas');
            console.log('[CheckOut] El usuario podrá ver la factura en FactuBox con estado "Pendiente"');

          } catch (errorGuardarPendiente) {
            console.error('[CheckOut] Error al guardar factura pendiente:', errorGuardarPendiente.message);
            // No fallar el checkout, solo loguear
          }
        }

        // Retornar factura con detalles (mapeo de campos DB → GraphQL)
        // Field resolvers en index.js mapean: numero_factura→numero, iva→impuestos, etc.
        const facturaCompleta = await pool.query(
          `SELECT f.*,
                  (SELECT rd.prefijo FROM resoluciones_dian rd WHERE rd.tipo_documento = 'factura' AND rd.activo = true LIMIT 1) as prefijo,
                  json_agg(json_build_object(
                    'metodo_pago_id', fmp.metodo_pago_id,
                    'monto', fmp.monto,
                    'referencia', fmp.referencia
                  )) FILTER (WHERE fmp.id IS NOT NULL) as metodos_pago
           FROM facturas f
           LEFT JOIN factura_metodos_pago fmp ON f.id = fmp.factura_id
           WHERE f.id = $1
           GROUP BY f.id`,
          [factura.id]
        );

        // =====================================================================
        // 14. AGREGAR A COLA DE IMPRESIÓN
        // =====================================================================
        try {
          // Obtener datos del cliente
          const clienteDatos = await pool.query(
            `SELECT c.nombre, c.apellido, c.tipo_documento, c.numero_documento
             FROM huespedes h
             LEFT JOIN clientes c ON h.cliente_id = c.id
             WHERE h.id = $1`,
            [hosp.huesped_id]
          );
          const clienteInfo = clienteDatos.rows[0];

          // Obtener habitación
          const habitacionDatos = await pool.query(
            'SELECT numero, tipo FROM habitaciones WHERE id = $1',
            [hosp.habitacion_id]
          );
          const habitacionInfo = habitacionDatos.rows[0];

          // Obtener nombres de métodos de pago
          const metodosPagoDatos = await pool.query(
            `SELECT fmp.monto, fmp.referencia, mp.nombre
             FROM factura_metodos_pago fmp
             JOIN metodos_pago mp ON fmp.metodo_pago_id = mp.id
             WHERE fmp.factura_id = $1`,
            [factura.id]
          );

          // Obtener factura electrónica con datos completos de resolución
          const feResult = await pool.query(
            `SELECT fe.cufe, fe.numero_factura_electronica, fe.pdf_url, fe.xml_url,
                    fe.factus_status, cf.resolucion_dian as numero_resolucion,
                    cf.prefijo, cf.fecha_inicio_resolucion as fecha_vigencia_desde,
                    cf.fecha_fin_resolucion as fecha_vigencia_hasta
             FROM facturas_electronicas fe
             LEFT JOIN configuracion_factus cf ON cf.id = (SELECT id FROM configuracion_factus WHERE activo = true ORDER BY id DESC LIMIT 1)
             WHERE fe.factura_id = $1`,
            [factura.id]
          );
          const facturaElectronica = feResult.rows[0] || null;

          // Obtener datos del hotel para el header del recibo
          const datosHotelResult = await pool.query('SELECT * FROM datos_hotel LIMIT 1');
          const datosHotel = datosHotelResult.rows[0];

          // Construir detalles (hospedaje + consumos)
          const detallesImpresion = [
            {
              descripcion: `Hospedaje Hab. ${habitacionInfo?.numero || 'N/A'} (${nochesReales} noche${nochesReales > 1 ? 's' : ''})`,
              cantidad: nochesReales,
              precio_unitario: parseFloat(hosp.precio_noche),
              subtotal: parseFloat(hosp.precio_noche) * nochesReales
            },
            ...consumos.rows.map(c => ({
              descripcion: c.descripcion || 'Consumo',
              cantidad: parseInt(c.cantidad) || 1,
              precio_unitario: parseFloat(c.precio_unitario) || 0,
              subtotal: parseFloat(c.precio_total) || 0
            }))
          ];

          // Construir datos para impresión
          const datosImpresion = construirDatosFactura(
            factura,
            detallesImpresion,
            metodosPagoDatos.rows,
            facturaElectronica,
            {
              cliente: clienteInfo ? {
                nombre: `${clienteInfo.nombre || ''} ${clienteInfo.apellido || ''}`.trim(),
                tipo_documento: clienteInfo.tipo_documento || 'CC',
                numero_documento: clienteInfo.numero_documento
              } : null,
              hospedaje: {
                habitacion_numero: habitacionInfo?.numero,
                habitacion_tipo: habitacionInfo?.tipo,
                noches: nochesReales,
                precio_noche: parseFloat(hosp.precio_noche),
                fecha_checkin: hosp.fecha_entrada,
                fecha_checkout: hosp.fecha_salida_real || new Date().toISOString()
              },
              configuracion: datosHotel ? {
                nombre_negocio: datosHotel.nombre_comercial,
                nit: datosHotel.nit,
                direccion: datosHotel.direccion,
                ciudad: datosHotel.ciudad,
                telefono: datosHotel.telefono || datosHotel.celular
              } : null
            }
          );

          // Agregar a cola de impresión
          await agregarFacturaACola(pool, factura.id, datosImpresion, 1);
          console.log('[CheckOut] Factura agregada a cola de impresión');

        } catch (errorCola) {
          console.error('[CheckOut] Error al agregar a cola de impresión:', errorCola.message);
          // No fallar el checkout si falla la cola de impresión
        }

        return facturaCompleta.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en checkOut mutation:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    /**
     * Cancelar un hospedaje
     * @param {Number} id - ID del hospedaje
     * @param {String} motivo - Motivo de cancelación
     * @returns {Object} Hospedaje cancelado
     */
    cancelarHospedaje: async (_, { id, motivo }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Obtener hospedaje
        const hospedaje = await client.query(
          'SELECT * FROM hospedajes WHERE id = $1',
          [id]
        );

        if (hospedaje.rows.length === 0) {
          throw new Error('Hospedaje no encontrado');
        }

        const hosp = hospedaje.rows[0];

        if (hosp.estado !== 'activo') {
          throw new Error('Solo se pueden cancelar hospedajes activos');
        }

        // Actualizar hospedaje
        await client.query(
          `UPDATE hospedajes SET
             estado = 'cancelado',
             observaciones = COALESCE(observaciones || ' | ', '') || 'Cancelado: ' || $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [motivo, id]
        );

        // Liberar habitación solo si no hay otros hospedajes activos en ella
        const otrosActivos = await client.query(
          'SELECT COUNT(*) FROM hospedajes WHERE habitacion_id = $1 AND estado = $2 AND id != $3',
          [hosp.habitacion_id, 'activo', id]
        );
        if (parseInt(otrosActivos.rows[0].count) === 0) {
          await client.query(
            'UPDATE habitaciones SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['disponible', hosp.habitacion_id]
          );
        }

        // Si tiene reserva, cancelarla también
        if (hosp.reserva_id) {
          await client.query(
            'UPDATE reservas SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['cancelada', hosp.reserva_id]
          );
        }

        await client.query('COMMIT');

        const result = await pool.query('SELECT * FROM hospedajes WHERE id = $1', [id]);
        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en cancelarHospedaje mutation:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    cambiarHabitacionHospedaje: async (_, { id, nueva_habitacion_id }, { pool, user }) => {
      if (!user) throw new Error('No autenticado');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const hospedaje = await client.query('SELECT * FROM hospedajes WHERE id = $1', [id]);
        if (hospedaje.rows.length === 0) throw new Error('Hospedaje no encontrado');
        if (hospedaje.rows[0].estado !== 'activo') throw new Error('Solo se pueden mover hospedajes activos');

        const habitacionAnterior = hospedaje.rows[0].habitacion_id;

        // Verificar que la nueva habitación existe y está disponible
        const nuevaHab = await client.query('SELECT * FROM habitaciones WHERE id = $1', [nueva_habitacion_id]);
        if (nuevaHab.rows.length === 0) throw new Error('Habitación no encontrada');

        // Verificar conflictos
        const conflictos = await client.query(`
          SELECT id FROM hospedajes
          WHERE habitacion_id = $1 AND estado = 'activo' AND id != $2
          LIMIT 1
        `, [nueva_habitacion_id, id]);

        if (conflictos.rows.length > 0) throw new Error('La habitación ya tiene un hospedaje activo');

        // Mover hospedaje
        await client.query('UPDATE hospedajes SET habitacion_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [nueva_habitacion_id, id]);

        // Actualizar estados de habitaciones
        await client.query("UPDATE habitaciones SET estado = 'ocupada' WHERE id = $1", [nueva_habitacion_id]);

        // Liberar habitación anterior si no tiene otros hospedajes activos
        const otrosHospedajes = await client.query(
          "SELECT id FROM hospedajes WHERE habitacion_id = $1 AND estado = 'activo' AND id != $2 LIMIT 1",
          [habitacionAnterior, id]
        );
        if (otrosHospedajes.rows.length === 0) {
          await client.query("UPDATE habitaciones SET estado = 'disponible' WHERE id = $1", [habitacionAnterior]);
        }

        await client.query('COMMIT');

        const result = await pool.query('SELECT * FROM hospedajes WHERE id = $1', [id]);
        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en cambiarHabitacionHospedaje:', error);
        throw error;
      } finally {
        client.release();
      }
    },
  },

};

module.exports = hospedajesResolvers;
