const reservasResolvers = {
  Reserva: {
    habitacion: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1',
          [parent.habitacion_id]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error al obtener habitación de reserva:', error);
        return null;
      }
    },
    huesped: async (parent, _, { pool }) => {
      try {
        console.log('🔍 [Reserva.huesped] Buscando huésped con ID:', parent.huesped_id);
        console.log('🔍 [Reserva.huesped] Pool disponible:', !!pool);

        // Get huesped with cliente data, usando COALESCE para fallbacks
        const result = await pool.query(`
          SELECT
            h.id,
            h.cliente_id,
            h.tipo_documento,
            h.numero_documento,
            h.fecha_nacimiento,
            h.nacionalidad,
            COALESCE(h.telefono, c.telefono) as telefono,
            COALESCE(h.email, c.email) as email,
            h.direccion,
            h.ciudad,
            h.pais,
            h.contacto_emergencia,
            h.telefono_emergencia,
            h.observaciones,
            h.preferencias,
            h.created_at,
            c.nombre || ' ' || COALESCE(c.apellido, '') as nombre_completo
          FROM huespedes h
          JOIN clientes c ON c.id = h.cliente_id
          WHERE h.id = $1
        `, [parent.huesped_id]);

        if (result.rows.length === 0) {
          console.warn('⚠️  [Reserva.huesped] No se encontró huésped con ID:', parent.huesped_id);
          return null;
        }

        console.log('✅ [Reserva.huesped] Huésped encontrado:', {
          id: result.rows[0].id,
          nombre_completo: result.rows[0].nombre_completo,
          tipo_documento: result.rows[0].tipo_documento,
          numero_documento: result.rows[0].numero_documento,
          telefono: result.rows[0].telefono,
          email: result.rows[0].email
        });

        return result.rows[0];
      } catch (error) {
        console.error('❌ [Reserva.huesped] Error al obtener huésped de reserva:', error);
        return null;
      }
    }
  },
  Query: {
    /**
     * Obtener todas las reservas con filtros opcionales
     * @param {String} estado - Filtro por estado
     * @param {Date} fecha_desde - Filtro por fecha desde
     * @param {Date} fecha_hasta - Filtro por fecha hasta
     * @returns {Array} Lista de reservas
     */
    reservas: async (_, { estado, fecha_desde, fecha_hasta }, { pool }) => {
      try {
        let query = `
          SELECT r.*,
                 h.numero as habitacion_numero,
                 h.tipo as habitacion_tipo,
                 hues.numero_documento as huesped_documento,
                 c.nombre || ' ' || COALESCE(c.apellido, '') as huesped_nombre
          FROM reservas r
          JOIN habitaciones h ON h.id = r.habitacion_id
          JOIN huespedes hues ON hues.id = r.huesped_id
          JOIN clientes c ON c.id = hues.cliente_id
          WHERE 1=1
        `;
        const params = [];

        if (estado) {
          params.push(estado);
          query += ` AND r.estado = $${params.length}`;
        }

        if (fecha_desde) {
          params.push(fecha_desde);
          query += ` AND r.fecha_entrada >= $${params.length}`;
        }

        if (fecha_hasta) {
          params.push(fecha_hasta);
          query += ` AND r.fecha_salida <= $${params.length}`;
        }

        query += ' ORDER BY r.fecha_entrada DESC, r.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error en reservas query:', error);
        throw new Error('Error al obtener reservas');
      }
    },

    /**
     * Obtener una reserva por ID
     * @param {Number} id - ID de la reserva
     * @returns {Object} Reserva
     */
    reserva: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT r.*,
                  h.numero as habitacion_numero,
                  h.tipo as habitacion_tipo,
                  h.precio_noche as habitacion_precio,
                  hues.numero_documento as huesped_documento,
                  c.nombre || ' ' || COALESCE(c.apellido, '') as huesped_nombre,
                  c.telefono as huesped_telefono,
                  c.email as huesped_email
           FROM reservas r
           JOIN habitaciones h ON h.id = r.habitacion_id
           JOIN huespedes hues ON hues.id = r.huesped_id
           JOIN clientes c ON c.id = hues.cliente_id
           WHERE r.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error('Reserva no encontrada');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en reserva query:', error);
        throw error;
      }
    },

    /**
     * Obtener una reserva por código
     * @param {String} codigo - Código de la reserva
     * @returns {Object} Reserva
     */
    reservaPorCodigo: async (_, { codigo }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT r.*,
                  h.numero as habitacion_numero,
                  h.tipo as habitacion_tipo,
                  hues.numero_documento as huesped_documento,
                  c.nombre || ' ' || COALESCE(c.apellido, '') as huesped_nombre
           FROM reservas r
           JOIN habitaciones h ON h.id = r.habitacion_id
           JOIN huespedes hues ON hues.id = r.huesped_id
           JOIN clientes c ON c.id = hues.cliente_id
           WHERE r.codigo = $1`,
          [codigo]
        );

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en reservaPorCodigo query:', error);
        throw new Error('Error al buscar reserva por código');
      }
    },

    /**
     * Obtener reservas del día actual
     * @returns {Array} Lista de reservas del día
     */
    reservasDelDia: async (_, __, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT r.*,
                 h.numero as habitacion_numero,
                 h.tipo as habitacion_tipo,
                 c.nombre || ' ' || COALESCE(c.apellido, '') as huesped_nombre
          FROM reservas r
          JOIN habitaciones h ON h.id = r.habitacion_id
          JOIN huespedes hues ON hues.id = r.huesped_id
          JOIN clientes c ON c.id = hues.cliente_id
          WHERE r.fecha_entrada = CURRENT_DATE
            AND r.estado IN ('pendiente', 'confirmada')
          ORDER BY h.numero
        `);

        return result.rows;
      } catch (error) {
        console.error('Error en reservasDelDia query:', error);
        throw new Error('Error al obtener reservas del día');
      }
    },

    /**
     * Obtener reservas próximas (próximos N días)
     * @param {Number} dias - Número de días a futuro (default: 7)
     * @returns {Array} Lista de reservas próximas
     */
    reservasProximas: async (_, { dias = 7 }, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT r.*,
                 h.numero as habitacion_numero,
                 h.tipo as habitacion_tipo,
                 c.nombre || ' ' || COALESCE(c.apellido, '') as huesped_nombre,
                 hues.telefono as huesped_telefono,
                 DATE_PART('day', r.fecha_entrada - CURRENT_DATE) as dias_para_entrada
          FROM reservas r
          JOIN habitaciones h ON h.id = r.habitacion_id
          JOIN huespedes hues ON hues.id = r.huesped_id
          JOIN clientes c ON c.id = hues.cliente_id
          WHERE r.estado IN ('pendiente', 'confirmada')
            AND r.fecha_entrada >= CURRENT_DATE
            AND r.fecha_entrada <= CURRENT_DATE + $1
          ORDER BY r.fecha_entrada, h.numero
        `, [dias]);

        return result.rows;
      } catch (error) {
        console.error('Error en reservasProximas query:', error);
        throw new Error('Error al obtener reservas próximas');
      }
    },
  },

  Mutation: {
    /**
     * Crear una nueva reserva
     * LÓGICA COMPLEJA: Validación de disponibilidad, cálculos automáticos, actualización de estado de habitación
     * @param {Object} input - Datos de la reserva
     * @returns {Object} Reserva creada
     */
    crearReserva: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Lock exclusivo por habitación para prevenir race conditions de solapamiento
        await client.query('SELECT pg_advisory_xact_lock($1)', [input.habitacion_id]);

        // 1. Validar que la habitación existe y está activa
        const habitacion = await client.query(
          'SELECT * FROM habitaciones WHERE id = $1 AND activa = true',
          [input.habitacion_id]
        );

        if (habitacion.rows.length === 0) {
          throw new Error('Habitación no encontrada o inactiva');
        }

        // 2. Validar que el huésped existe
        const huesped = await client.query(
          'SELECT * FROM huespedes WHERE id = $1',
          [input.huesped_id]
        );

        if (huesped.rows.length === 0) {
          throw new Error('Huésped no encontrado');
        }

        // 3. Validar que las fechas son correctas
        const fechaEntrada = new Date(input.fecha_entrada);
        const fechaSalida = new Date(input.fecha_salida);

        // VALIDACIÓN CRÍTICA: No permitir reservas con fechas pasadas
        // Comparar solo las fechas como strings YYYY-MM-DD para evitar problemas de timezone
        const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // formato YYYY-MM-DD
        const entradaStr = input.fecha_entrada.split('T')[0];

        if (entradaStr < hoyStr) {
          throw new Error('La fecha de entrada no puede ser anterior a hoy');
        }

        if (fechaSalida <= fechaEntrada) {
          throw new Error('La fecha de salida debe ser posterior a la fecha de entrada');
        }

        // 4. Calcular número de noches
        const diffTime = Math.abs(fechaSalida - fechaEntrada);
        const noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (noches <= 0) {
          throw new Error('El número de noches debe ser mayor a 0');
        }

        // 5. Verificar disponibilidad de la habitación (no debe haber reservas que se solapen)
        const conflictos = await client.query(`
          SELECT id, codigo, fecha_entrada, fecha_salida
          FROM reservas
          WHERE habitacion_id = $1
            AND estado IN ('pendiente', 'confirmada', 'en_curso')
            AND (
              (fecha_entrada <= $2 AND fecha_salida > $2)
              OR (fecha_entrada < $3 AND fecha_salida >= $3)
              OR (fecha_entrada >= $2 AND fecha_salida <= $3)
            )
        `, [input.habitacion_id, input.fecha_entrada, input.fecha_salida]);

        if (conflictos.rows.length > 0) {
          throw new Error(`La habitación ya tiene una reserva (${conflictos.rows[0].codigo}) para esas fechas`);
        }

        // 6. Calcular precios
        const precioNoche = input.precio_noche || habitacion.rows[0].precio_noche;
        const precioTotal = noches * precioNoche;
        const anticipo = input.anticipo || 0;

        // 7. Validar anticipo
        if (isNaN(anticipo) || anticipo < 0 || anticipo > precioTotal) {
          throw new Error('El anticipo debe ser un número entre 0 y el precio total');
        }

        const saldoPendiente = precioTotal - anticipo;

        // 8. Insertar reserva (el trigger generará el código automáticamente)
        const reservaResult = await client.query(`
          INSERT INTO reservas (
            habitacion_id, huesped_id, fecha_entrada, fecha_salida,
            noches, precio_noche, precio_total, anticipo, saldo_pendiente,
            estado, canal_reserva, observaciones, notas_especiales, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `, [
          input.habitacion_id,
          input.huesped_id,
          input.fecha_entrada,
          input.fecha_salida,
          noches,
          precioNoche,
          precioTotal,
          anticipo,
          saldoPendiente,
          'pendiente',
          input.canal || 'directo',
          input.observaciones || null,
          input.notas_especiales || null,
          user.id,
        ]);

        // 9. Actualizar código de reserva (ejecutar el trigger manualmente)
        const reservaId = reservaResult.rows[0].id;
        const fechaCodigo = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).replace(/-/g, '');
        const codigoReserva = `RES-${fechaCodigo}-${String(reservaId).padStart(4, '0')}`;

        await client.query(
          'UPDATE reservas SET codigo = $1 WHERE id = $2',
          [codigoReserva, reservaId]
        );

        // 10. Actualizar estado de habitación a 'reservada'
        await client.query(
          'UPDATE habitaciones SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['reservada', input.habitacion_id]
        );

        await client.query('COMMIT');

        // 11. Obtener reserva completa
        const reservaCompleta = await pool.query(
          'SELECT * FROM reservas WHERE id = $1',
          [reservaId]
        );

        return reservaCompleta.rows[0];

      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en crearReserva mutation:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    /**
     * Confirmar una reserva (cambiar de 'pendiente' a 'confirmada')
     * @param {Number} id - ID de la reserva
     * @returns {Object} Reserva confirmada
     */
    confirmarReserva: async (_, { id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que la reserva existe y está pendiente
        const reserva = await pool.query(
          'SELECT * FROM reservas WHERE id = $1',
          [id]
        );

        if (reserva.rows.length === 0) {
          throw new Error('Reserva no encontrada');
        }

        if (reserva.rows[0].estado !== 'pendiente') {
          throw new Error(`No se puede confirmar una reserva en estado '${reserva.rows[0].estado}'`);
        }

        // Actualizar estado a confirmada
        const result = await pool.query(
          `UPDATE reservas
           SET estado = 'confirmada',
               confirmed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en confirmarReserva mutation:', error);
        throw error;
      }
    },

    /**
     * Cancelar una reserva
     * @param {Number} id - ID de la reserva
     * @param {String} motivo - Motivo de cancelación
     * @returns {Object} Reserva cancelada
     */
    cancelarReserva: async (_, { id, motivo }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Verificar que la reserva existe
        const reserva = await client.query(
          'SELECT * FROM reservas WHERE id = $1',
          [id]
        );

        if (reserva.rows.length === 0) {
          throw new Error('Reserva no encontrada');
        }

        if (reserva.rows[0].estado === 'cancelada') {
          throw new Error('La reserva ya está cancelada');
        }

        if (reserva.rows[0].estado === 'en_curso' || reserva.rows[0].estado === 'finalizada') {
          throw new Error(`No se puede cancelar una reserva en estado '${reserva.rows[0].estado}'`);
        }

        // Actualizar estado a cancelada
        const result = await client.query(
          `UPDATE reservas
           SET estado = 'cancelada',
               cancelled_at = CURRENT_TIMESTAMP,
               motivo_cancelacion = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id, motivo || 'Sin motivo especificado']
        );

        // Verificar si la habitación puede volver a estar disponible
        // (solo si no hay otras reservas activas o check-ins)
        const otrasReservas = await client.query(`
          SELECT id FROM reservas
          WHERE habitacion_id = $1
            AND estado IN ('pendiente', 'confirmada', 'en_curso')
            AND id != $2
          LIMIT 1
        `, [reserva.rows[0].habitacion_id, id]);

        const hospedajesActivos = await client.query(`
          SELECT id FROM hospedajes
          WHERE habitacion_id = $1 AND estado = 'activo'
          LIMIT 1
        `, [reserva.rows[0].habitacion_id]);

        // Si no hay otras reservas ni hospedajes activos, marcar habitación como disponible
        if (otrasReservas.rows.length === 0 && hospedajesActivos.rows.length === 0) {
          await client.query(
            'UPDATE habitaciones SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['disponible', reserva.rows[0].habitacion_id]
          );
        }

        await client.query('COMMIT');

        return result.rows[0];

      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en cancelarReserva mutation:', error);
        throw error;
      } finally {
        client.release();
      }
    },

    /**
     * Actualizar una reserva existente
     * @param {Number} id - ID de la reserva
     * @param {Object} input - Datos a actualizar
     * @returns {Object} Reserva actualizada
     */
    actualizarReserva: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Verificar que la reserva existe
        const reserva = await client.query(
          'SELECT * FROM reservas WHERE id = $1',
          [id]
        );

        if (reserva.rows.length === 0) {
          throw new Error('Reserva no encontrada');
        }

        // Solo se pueden actualizar reservas pendientes o confirmadas
        if (!['pendiente', 'confirmada'].includes(reserva.rows[0].estado)) {
          throw new Error(`No se puede actualizar una reserva en estado '${reserva.rows[0].estado}'`);
        }

        const reservaActual = reserva.rows[0];

        // Lock exclusivo por habitación para prevenir race conditions
        await client.query('SELECT pg_advisory_xact_lock($1)', [reservaActual.habitacion_id]);
        if (input.habitacion_id && input.habitacion_id !== reservaActual.habitacion_id) {
          await client.query('SELECT pg_advisory_xact_lock($1)', [input.habitacion_id]);
        }

        // Determinar habitación y fechas
        const habitacionId = input.habitacion_id || reservaActual.habitacion_id;
        const fechaEntrada = input.fecha_entrada || reservaActual.fecha_entrada;
        const fechaSalida = input.fecha_salida || reservaActual.fecha_salida;

        // Validar que la fecha de entrada no sea en el pasado
        if (input.fecha_entrada) {
          const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
          const entradaStr = String(input.fecha_entrada).split('T')[0];
          if (entradaStr < hoyStr) {
            throw new Error('La fecha de entrada no puede ser anterior a hoy');
          }
        }

        // Validar fechas
        if (new Date(fechaSalida) <= new Date(fechaEntrada)) {
          throw new Error('La fecha de salida debe ser posterior a la fecha de entrada');
        }

        // Calcular noches
        const diffTime = Math.abs(new Date(fechaSalida) - new Date(fechaEntrada));
        const noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Verificar disponibilidad si cambiaron fechas o habitación
        if (input.fecha_entrada || input.fecha_salida || input.habitacion_id) {
          const conflictos = await client.query(`
            SELECT id, codigo FROM reservas
            WHERE habitacion_id = $1
              AND estado IN ('pendiente', 'confirmada', 'en_curso')
              AND id != $2
              AND (
                (fecha_entrada <= $3 AND fecha_salida > $3)
                OR (fecha_entrada < $4 AND fecha_salida >= $4)
                OR (fecha_entrada >= $3 AND fecha_salida <= $4)
              )
          `, [habitacionId, id, fechaEntrada, fechaSalida]);

          if (conflictos.rows.length > 0) {
            throw new Error(`La habitación ya tiene una reserva (${conflictos.rows[0].codigo}) para esas fechas`);
          }
        }

        // Calcular precios
        const precioNoche = input.precio_noche || reservaActual.precio_noche;
        const precioTotal = noches * precioNoche;
        const anticipo = input.anticipo !== undefined ? input.anticipo : reservaActual.anticipo;

        // Validar anticipo
        if (anticipo < 0 || anticipo > precioTotal) {
          throw new Error('El anticipo debe estar entre 0 y el precio total');
        }

        const saldoPendiente = precioTotal - anticipo;

        // Actualizar reserva
        const result = await client.query(`
          UPDATE reservas SET
            habitacion_id = $1,
            fecha_entrada = $2,
            fecha_salida = $3,
            noches = $4,
            precio_noche = $5,
            precio_total = $6,
            anticipo = $7,
            saldo_pendiente = $8,
            observaciones = $9,
            notas_especiales = $10,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $11
          RETURNING *
        `, [
          habitacionId,
          fechaEntrada,
          fechaSalida,
          noches,
          precioNoche,
          precioTotal,
          anticipo,
          saldoPendiente,
          input.observaciones !== undefined ? input.observaciones : reservaActual.observaciones,
          input.notas_especiales !== undefined ? input.notas_especiales : reservaActual.notas_especiales,
          id,
        ]);

        // Si cambió de habitación, actualizar estados de habitaciones
        if (input.habitacion_id && input.habitacion_id !== reservaActual.habitacion_id) {
          // Verificar si la habitación anterior tiene otras reservas activas
          const otrasReservas = await client.query(`
            SELECT id FROM reservas
            WHERE habitacion_id = $1 AND id != $2
              AND estado IN ('pendiente', 'confirmada', 'en_curso')
            LIMIT 1
          `, [reservaActual.habitacion_id, id]);

          if (otrasReservas.rows.length === 0) {
            await client.query(
              "UPDATE habitaciones SET estado = 'disponible' WHERE id = $1",
              [reservaActual.habitacion_id]
            );
          }

          await client.query(
            "UPDATE habitaciones SET estado = 'reservada' WHERE id = $1",
            [input.habitacion_id]
          );
        }

        await client.query('COMMIT');

        return result.rows[0];

      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en actualizarReserva mutation:', error);
        throw error;
      } finally {
        client.release();
      }
    },
  },
};

// Resolver de alertas de reservas (query independiente)
reservasResolvers.Query.alertasReservas = async (_, __, { pool }) => {
  try {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    const [llegadas, enCurso, salidas, lateCheckouts, pendientes] = await Promise.all([
      // Llegadas hoy: reservas confirmadas con fecha_entrada = hoy
      pool.query(
        `SELECT COUNT(*)::int as count FROM reservas
         WHERE fecha_entrada = $1 AND estado = 'confirmada'`,
        [hoy]
      ),
      // En curso: hospedajes activos
      pool.query(
        `SELECT COUNT(*)::int as count FROM hospedajes WHERE estado = 'activo'`
      ),
      // Salidas hoy: hospedajes activos con fecha_salida_prevista = hoy
      pool.query(
        `SELECT COUNT(*)::int as count FROM hospedajes
         WHERE estado = 'activo' AND fecha_salida_prevista = $1`,
        [hoy]
      ),
      // Late checkouts: hospedajes activos con fecha_salida_prevista < hoy
      pool.query(
        `SELECT COUNT(*)::int as count FROM hospedajes
         WHERE estado = 'activo' AND fecha_salida_prevista < $1`,
        [hoy]
      ),
      // Pendientes sin confirmar
      pool.query(
        `SELECT COUNT(*)::int as count FROM reservas WHERE estado = 'pendiente'`
      ),
    ]);

    return {
      llegadasHoy: llegadas.rows[0].count,
      enCurso: enCurso.rows[0].count,
      salidasHoy: salidas.rows[0].count,
      lateCheckouts: lateCheckouts.rows[0].count,
      pendientesSinConfirmar: pendientes.rows[0].count,
    };
  } catch (error) {
    console.error('Error en alertasReservas:', error);
    return { llegadasHoy: 0, enCurso: 0, salidasHoy: 0, lateCheckouts: 0, pendientesSinConfirmar: 0 };
  }
};

module.exports = reservasResolvers;
