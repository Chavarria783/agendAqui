/**
 * Tests unitarios para el resolver de Habitaciones
 * Módulo: Habitaciones (Sprint 1)
 */
const habitacionesResolvers = require('../resolvers/habitaciones');
const { createMockPool } = require('./helpers/mockPool');

describe('Habitaciones Resolvers', () => {
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ mockPool } = createMockPool());
  });

  // =====================================================================
  // Query: habitaciones
  // =====================================================================
  describe('Query: habitaciones', () => {
    it('debe retornar todas las habitaciones activas', async () => {
      const mockHabitaciones = [
        { id: 1, numero: '101', estado: 'disponible', piso: 1 },
        { id: 2, numero: '102', estado: 'ocupada', piso: 1 },
      ];
      mockPool.query.mockResolvedValue({ rows: mockHabitaciones });

      const result = await habitacionesResolvers.Query.habitaciones(null, {}, { pool: mockPool });

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('activa = true'),
        []
      );
    });

    it('debe filtrar por estado cuando se proporciona', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, estado: 'disponible' }] });

      await habitacionesResolvers.Query.habitaciones(null, { estado: 'disponible' }, { pool: mockPool });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('estado = $1'),
        ['disponible']
      );
    });

    it('debe filtrar por piso cuando se proporciona', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await habitacionesResolvers.Query.habitaciones(null, { piso: 2 }, { pool: mockPool });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('piso = $1'),
        [2]
      );
    });
  });

  // =====================================================================
  // Query: habitacion
  // =====================================================================
  describe('Query: habitacion', () => {
    it('debe retornar la habitación por ID', async () => {
      const mockHab = { id: 1, numero: '101', estado: 'disponible' };
      mockPool.query.mockResolvedValue({ rows: [mockHab] });

      const result = await habitacionesResolvers.Query.habitacion(null, { id: 1 }, { pool: mockPool });

      expect(result).toEqual(mockHab);
    });

    it('debe lanzar error si la habitación no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        habitacionesResolvers.Query.habitacion(null, { id: 999 }, { pool: mockPool })
      ).rejects.toThrow('Habitación no encontrada');
    });
  });

  // =====================================================================
  // Query: estadisticasHabitaciones
  // =====================================================================
  describe('Query: estadisticasHabitaciones', () => {
    it('debe retornar estadísticas con porcentaje de ocupación', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          total: '10', disponibles: '5', ocupadas: '3',
          limpieza: '1', mantenimiento: '0', reservadas: '1',
        }],
      });

      const result = await habitacionesResolvers.Query.estadisticasHabitaciones(null, {}, { pool: mockPool });

      expect(result.total).toBe(10);
      expect(result.disponibles).toBe(5);
      expect(result.ocupadas).toBe(3);
      expect(result.porcentaje_ocupacion).toBe(30);
    });

    it('debe retornar 0% de ocupación si no hay habitaciones', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ total: '0', disponibles: '0', ocupadas: '0', limpieza: '0', mantenimiento: '0', reservadas: '0' }],
      });

      const result = await habitacionesResolvers.Query.estadisticasHabitaciones(null, {}, { pool: mockPool });

      expect(result.total).toBe(0);
      expect(result.porcentaje_ocupacion).toBe(0);
    });
  });

  // =====================================================================
  // Mutation: crearHabitacion
  // =====================================================================
  describe('Mutation: crearHabitacion', () => {
    const validInput = {
      numero: '201', piso: 2, tipo: 'doble', capacidad: 2,
      precio_noche: 150000, descripcion: 'Habitación doble',
    };

    it('debe crear habitación con datos válidos', async () => {
      const mockCreated = { id: 1, ...validInput, estado: 'disponible', activa: true };
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // existente check
        .mockResolvedValueOnce({ rows: [mockCreated] }); // INSERT

      const result = await habitacionesResolvers.Mutation.crearHabitacion(
        null, { input: validInput },
        { pool: mockPool, user: { id: 1, rol: 'admin' } }
      );

      expect(result.numero).toBe('201');
      expect(result.estado).toBe('disponible');
    });

    it('debe lanzar error si el usuario no es admin', async () => {
      await expect(
        habitacionesResolvers.Mutation.crearHabitacion(
          null, { input: validInput },
          { pool: mockPool, user: { id: 2, rol: 'recepcionista' } }
        )
      ).rejects.toThrow('No autorizado');
    });

    it('debe lanzar error si el número ya existe', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // existente

      await expect(
        habitacionesResolvers.Mutation.crearHabitacion(
          null, { input: validInput },
          { pool: mockPool, user: { id: 1, rol: 'admin' } }
        )
      ).rejects.toThrow('Ya existe una habitación con el número 201');
    });

    it('debe lanzar error si el precio es negativo o cero', async () => {
      await expect(
        habitacionesResolvers.Mutation.crearHabitacion(
          null, { input: { ...validInput, precio_noche: 0 } },
          { pool: mockPool, user: { id: 1, rol: 'admin' } }
        )
      ).rejects.toThrow('El precio por noche debe ser mayor a 0');
    });

    it('debe lanzar error si la capacidad excede 20', async () => {
      await expect(
        habitacionesResolvers.Mutation.crearHabitacion(
          null, { input: { ...validInput, capacidad: 25 } },
          { pool: mockPool, user: { id: 1, rol: 'admin' } }
        )
      ).rejects.toThrow('La capacidad no puede exceder 20 personas');
    });

    it('debe lanzar error si no está autenticado', async () => {
      await expect(
        habitacionesResolvers.Mutation.crearHabitacion(
          null, { input: validInput },
          { pool: mockPool, user: null }
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  // =====================================================================
  // Mutation: cambiarEstadoHabitacion
  // =====================================================================
  describe('Mutation: cambiarEstadoHabitacion', () => {
    it('debe permitir transición válida: disponible → limpieza', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'limpieza' }] });

      const result = await habitacionesResolvers.Mutation.cambiarEstadoHabitacion(
        null, { id: 1, estado: 'limpieza' },
        { pool: mockPool, user: { id: 1, rol: 'admin' } }
      );

      expect(result.estado).toBe('limpieza');
    });

    it('debe permitir transición válida: limpieza → disponible', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'limpieza' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible' }] });

      const result = await habitacionesResolvers.Mutation.cambiarEstadoHabitacion(
        null, { id: 1, estado: 'disponible' },
        { pool: mockPool, user: { id: 1, rol: 'admin' } }
      );

      expect(result.estado).toBe('disponible');
    });

    it('debe rechazar cambio manual a "ocupada" (solo vía check-in)', async () => {
      // reservada → ocupada está en transiciones válidas, pero el código bloquea "ocupada" manualmente
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'reservada' }] });

      await expect(
        habitacionesResolvers.Mutation.cambiarEstadoHabitacion(
          null, { id: 1, estado: 'ocupada' },
          { pool: mockPool, user: { id: 1, rol: 'admin' } }
        )
      ).rejects.toThrow('No se puede cambiar a estado "ocupada" manualmente');
    });

    it('debe rechazar transición inválida: ocupada → disponible', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'ocupada' }] });

      await expect(
        habitacionesResolvers.Mutation.cambiarEstadoHabitacion(
          null, { id: 1, estado: 'disponible' },
          { pool: mockPool, user: { id: 1, rol: 'admin' } }
        )
      ).rejects.toThrow('Transición de estado no válida');
    });

    it('debe lanzar error si la habitación no existe', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        habitacionesResolvers.Mutation.cambiarEstadoHabitacion(
          null, { id: 999, estado: 'limpieza' },
          { pool: mockPool, user: { id: 1, rol: 'admin' } }
        )
      ).rejects.toThrow('Habitación no encontrada');
    });
  });

  // =====================================================================
  // Mutation: registrarLimpieza
  // =====================================================================
  describe('Mutation: registrarLimpieza', () => {
    it('debe cambiar habitación de limpieza a disponible', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'limpieza', activa: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible' }] });

      const result = await habitacionesResolvers.Mutation.registrarLimpieza(
        null, { habitacion_id: 1 },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('disponible');
    });

    it('debe lanzar error si la habitación no está en limpieza', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true }] });

      await expect(
        habitacionesResolvers.Mutation.registrarLimpieza(
          null, { habitacion_id: 1 },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La habitación no está en estado de limpieza');
    });
  });
});
