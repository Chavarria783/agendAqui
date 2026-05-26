const habitacionesResolvers = {
  Query: {
    /**
     * Obtener todas las habitaciones con filtros opcionales
     * @param {String} estado - Filtro por estado (disponible, ocupada, limpieza, mantenimiento, reservada)
     * @param {Number} piso - Filtro por piso
     * @returns {Array} Lista de habitaciones
     */
    habitaciones: async (_, { estado, piso }, { pool }) => {
      try {
        let query = 'SELECT * FROM habitaciones WHERE activa = true';
        const params = [];

        if (estado) {
          params.push(estado);
          query += ` AND estado = $${params.length}`;
        }

        if (piso) {
          params.push(piso);
          query += ` AND piso = $${params.length}`;
        }

        query += ' ORDER BY piso, numero';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error en habitaciones query:', error);
        throw new Error('Error al obtener habitaciones');
      }
    },

    /**
     * Obtener una habitación por ID
     * @param {Number} id - ID de la habitación
     * @returns {Object} Habitación
     */
    habitacion: async (_, { id }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1 AND activa = true',
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en habitacion query:', error);
        throw error;
      }
    },

    /**
     * Obtener una habitación por número
     * @param {String} numero - Número de habitación
     * @returns {Object} Habitación
     */
    habitacionPorNumero: async (_, { numero }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM habitaciones WHERE numero = $1 AND activa = true',
          [numero]
        );

        if (result.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error en habitacionPorNumero query:', error);
        throw error;
      }
    },

    /**
     * Obtener habitaciones disponibles para un rango de fechas
     * @param {Date} fecha_entrada - Fecha de entrada
     * @param {Date} fecha_salida - Fecha de salida
     * @param {String} tipo - Tipo de habitación (opcional)
     * @returns {Array} Lista de habitaciones disponibles
     */
    habitacionesDisponibles: async (_, { fecha_entrada, fecha_salida, tipo }, { pool }) => {
      try {
        let query = `
          SELECT h.*
          FROM habitaciones h
          WHERE h.activa = true
            AND h.estado != 'mantenimiento'
            AND NOT EXISTS (
              -- No tiene hospedaje activo que se solape con las fechas solicitadas
              SELECT 1 FROM hospedajes hosp
              WHERE hosp.habitacion_id = h.id
                AND hosp.estado = 'activo'
                AND hosp.fecha_entrada < $2
                AND hosp.fecha_salida_prevista > $1
            )
            AND NOT EXISTS (
              -- No tiene reserva que se solape con las fechas
              SELECT 1 FROM reservas r
              WHERE r.habitacion_id = h.id
                AND r.estado IN ('pendiente', 'confirmada', 'en_curso')
                AND (
                  (r.fecha_entrada < $2 AND r.fecha_salida > $1)
                )
            )
        `;

        const params = [fecha_entrada, fecha_salida];

        if (tipo) {
          params.push(tipo);
          query += ` AND h.tipo = $${params.length}`;
        }

        query += ' ORDER BY h.piso, h.numero';

        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error en habitacionesDisponibles query:', error);
        throw new Error('Error al buscar habitaciones disponibles');
      }
    },

    /**
     * Obtener estadísticas de habitaciones para el dashboard
     * @returns {Object} Estadísticas (total, disponibles, ocupadas, etc.)
     */
    estadisticasHabitaciones: async (_, __, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE estado = 'disponible') as disponibles,
            COUNT(*) FILTER (WHERE estado = 'ocupada') as ocupadas,
            COUNT(*) FILTER (WHERE estado = 'limpieza') as limpieza,
            COUNT(*) FILTER (WHERE estado = 'mantenimiento') as mantenimiento,
            COUNT(*) FILTER (WHERE estado = 'reservada') as reservadas
          FROM habitaciones
          WHERE activa = true
        `);

        const stats = result.rows[0];
        const total = parseInt(stats.total) || 0;
        const ocupadas = parseInt(stats.ocupadas) || 0;

        return {
          total,
          disponibles: parseInt(stats.disponibles) || 0,
          ocupadas,
          limpieza: parseInt(stats.limpieza) || 0,
          mantenimiento: parseInt(stats.mantenimiento) || 0,
          reservadas: parseInt(stats.reservadas) || 0,
          porcentaje_ocupacion: total > 0 ? parseFloat(((ocupadas / total) * 100).toFixed(2)) : 0,
        };
      } catch (error) {
        console.error('Error en estadisticasHabitaciones query:', error);
        throw new Error('Error al obtener estadísticas de habitaciones');
      }
    },

    /**
     * Obtener ocupación por tipo de habitación
     * @returns {Array} Ocupación agrupada por tipo
     */
    ocupacionPorTipo: async (_, __, { pool }) => {
      try {
        const result = await pool.query(`
          SELECT
            tipo,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE estado = 'ocupada') as ocupadas,
            COUNT(*) FILTER (WHERE estado IN ('disponible', 'limpieza')) as disponibles,
            ROUND((COUNT(*) FILTER (WHERE estado = 'ocupada')::numeric / COUNT(*)::numeric) * 100, 2) as porcentaje
          FROM habitaciones
          WHERE activa = true
          GROUP BY tipo
          ORDER BY tipo
        `);

        return result.rows.map(row => ({
          tipo: row.tipo,
          total: parseInt(row.total),
          ocupadas: parseInt(row.ocupadas),
          disponibles: parseInt(row.disponibles),
          porcentaje: parseFloat(row.porcentaje) || 0,
        }));
      } catch (error) {
        console.error('Error en ocupacionPorTipo query:', error);
        throw new Error('Error al obtener ocupación por tipo');
      }
    },
  },

  Mutation: {
    /**
     * Crear una nueva habitación
     * @param {Object} input - Datos de la habitación
     * @returns {Object} Habitación creada
     */
    crearHabitacion: async (_, { input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo admin puede crear habitaciones
      if (user.rol !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden crear habitaciones.');
      }

      try {
        // VALIDACIONES DE NEGOCIO
        // Validar precio razonable
        const precioNoche = parseFloat(input.precio_noche);
        if (precioNoche <= 0) {
          throw new Error('El precio por noche debe ser mayor a 0');
        }
        if (precioNoche > 10000000) {
          throw new Error('El precio por noche no puede exceder $10,000,000 COP');
        }

        // Validar capacidad razonable
        if (input.capacidad <= 0) {
          throw new Error('La capacidad debe ser mayor a 0');
        }
        if (input.capacidad > 20) {
          throw new Error('La capacidad no puede exceder 20 personas');
        }

        // Validar piso razonable
        if (input.piso <= 0) {
          throw new Error('El piso debe ser mayor a 0');
        }
        if (input.piso > 50) {
          throw new Error('El piso no puede exceder el piso 50');
        }

        // Verificar que no exista otra habitación con el mismo número
        const existente = await pool.query(
          'SELECT id FROM habitaciones WHERE numero = $1',
          [input.numero]
        );

        if (existente.rows.length > 0) {
          throw new Error(`Ya existe una habitación con el número ${input.numero}`);
        }

        // Insertar habitación
        const result = await pool.query(
          `INSERT INTO habitaciones (
            numero, piso, tipo, capacidad, precio_noche,
            descripcion, comodidades, imagen_url, estado, activa
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'disponible', true)
          RETURNING *`,
          [
            input.numero,
            input.piso,
            input.tipo,
            input.capacidad,
            input.precio_noche,
            input.descripcion || null,
            JSON.stringify(input.comodidades || []),
            input.imagen_url || null,
          ]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en crearHabitacion mutation:', error);
        throw error;
      }
    },

    /**
     * Actualizar una habitación existente
     * @param {Number} id - ID de la habitación
     * @param {Object} input - Datos a actualizar
     * @returns {Object} Habitación actualizada
     */
    actualizarHabitacion: async (_, { id, input }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      // Solo admin puede actualizar habitaciones
      if (user.rol !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden actualizar habitaciones.');
      }

      try {
        // Verificar que la habitación existe
        const habitacion = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1',
          [id]
        );

        if (habitacion.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        // Si se actualiza el número, verificar que no exista
        if (input.numero && input.numero !== habitacion.rows[0].numero) {
          const existente = await pool.query(
            'SELECT id FROM habitaciones WHERE numero = $1 AND id != $2',
            [input.numero, id]
          );

          if (existente.rows.length > 0) {
            throw new Error(`Ya existe otra habitación con el número ${input.numero}`);
          }
        }

        // Construir query dinámica de actualización
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (input.numero !== undefined) {
          updates.push(`numero = $${paramCount++}`);
          values.push(input.numero);
        }
        if (input.piso !== undefined) {
          updates.push(`piso = $${paramCount++}`);
          values.push(input.piso);
        }
        if (input.tipo !== undefined) {
          updates.push(`tipo = $${paramCount++}`);
          values.push(input.tipo);
        }
        if (input.capacidad !== undefined) {
          updates.push(`capacidad = $${paramCount++}`);
          values.push(input.capacidad);
        }
        if (input.precio_noche !== undefined) {
          updates.push(`precio_noche = $${paramCount++}`);
          values.push(input.precio_noche);
        }
        if (input.descripcion !== undefined) {
          updates.push(`descripcion = $${paramCount++}`);
          values.push(input.descripcion);
        }
        if (input.comodidades !== undefined) {
          updates.push(`comodidades = $${paramCount++}`);
          values.push(JSON.stringify(input.comodidades));
        }
        if (input.estado !== undefined) {
          updates.push(`estado = $${paramCount++}`);
          values.push(input.estado);
        }
        if (input.imagen_url !== undefined) {
          updates.push(`imagen_url = $${paramCount++}`);
          values.push(input.imagen_url);
        }

        if (updates.length === 0) {
          throw new Error('No hay campos para actualizar');
        }

        values.push(id);
        const query = `
          UPDATE habitaciones
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (error) {
        console.error('Error en actualizarHabitacion mutation:', error);
        throw error;
      }
    },

    /**
     * Cambiar el estado de una habitación
     * @param {Number} id - ID de la habitación
     * @param {String} estado - Nuevo estado
     * @returns {Object} Habitación actualizada
     */
    cambiarEstadoHabitacion: async (_, { id, estado }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que la habitación existe
        const habitacion = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1 AND activa = true',
          [id]
        );

        if (habitacion.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        const estadoActual = habitacion.rows[0].estado;

        // Validar transiciones de estado
        const transicionesValidas = {
          disponible: ['reservada', 'limpieza', 'mantenimiento'],
          ocupada: ['limpieza', 'mantenimiento'],
          limpieza: ['disponible', 'mantenimiento'],
          mantenimiento: ['disponible', 'limpieza'],
          reservada: ['disponible', 'ocupada', 'mantenimiento'],
        };

        if (!transicionesValidas[estadoActual]?.includes(estado)) {
          throw new Error(
            `Transición de estado no válida: ${estadoActual} → ${estado}`
          );
        }

        // No permitir cambiar a 'ocupada' manualmente (solo por check-in)
        if (estado === 'ocupada') {
          throw new Error('No se puede cambiar a estado "ocupada" manualmente. Use check-in.');
        }

        // Actualizar estado
        const result = await pool.query(
          `UPDATE habitaciones
           SET estado = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`,
          [estado, id]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en cambiarEstadoHabitacion mutation:', error);
        throw error;
      }
    },

    /**
     * Registrar limpieza de habitación
     * @param {Number} habitacion_id - ID de la habitación
     * @returns {Object} Habitación actualizada
     */
    registrarLimpieza: async (_, { habitacion_id }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que la habitación existe y está en limpieza
        const habitacion = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1 AND activa = true',
          [habitacion_id]
        );

        if (habitacion.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        if (habitacion.rows[0].estado !== 'limpieza') {
          throw new Error('La habitación no está en estado de limpieza');
        }

        // Actualizar estado a disponible y registrar timestamp de limpieza
        const result = await pool.query(
          `UPDATE habitaciones
           SET estado = 'disponible',
               ultima_limpieza = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [habitacion_id]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en registrarLimpieza mutation:', error);
        throw error;
      }
    },

    /**
     * Registrar mantenimiento de habitación
     * @param {Number} habitacion_id - ID de la habitación
     * @param {String} notas - Notas del mantenimiento
     * @returns {Object} Habitación actualizada
     */
    registrarMantenimiento: async (_, { habitacion_id, notas }, { pool, user }) => {
      if (!user) {
        throw new Error('No autenticado');
      }

      try {
        // Verificar que la habitación existe
        const habitacion = await pool.query(
          'SELECT * FROM habitaciones WHERE id = $1 AND activa = true',
          [habitacion_id]
        );

        if (habitacion.rows.length === 0) {
          throw new Error('Habitación no encontrada');
        }

        // Actualizar estado y registrar mantenimiento
        const result = await pool.query(
          `UPDATE habitaciones
           SET estado = 'mantenimiento',
               ultima_mantenimiento = CURRENT_TIMESTAMP,
               notas_mantenimiento = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [habitacion_id, notas || null]
        );

        return result.rows[0];
      } catch (error) {
        console.error('Error en registrarMantenimiento mutation:', error);
        throw error;
      }
    },
  },
};

module.exports = habitacionesResolvers;
