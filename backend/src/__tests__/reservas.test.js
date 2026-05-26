/**
 * Tests unitarios para el resolver de Reservas
 * Módulo: Reservas (Sprint 2)
 */
const reservasResolvers = require('../resolvers/reservas');
const { createMockPool } = require('./helpers/mockPool');

describe('Reservas Resolvers', () => {
  let mockPool, mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ mockPool, mockClient } = createMockPool());
  });

  // =====================================================================
  // Query: reservas
  // =====================================================================
  describe('Query: reservas', () => {
    it('debe retornar todas las reservas', async () => {
      const mockReservas = [
        { id: 1, codigo: 'RES-20260519-0001', estado: 'pendiente' },
        { id: 2, codigo: 'RES-20260519-0002', estado: 'confirmada' },
      ];
      mockPool.query.mockResolvedValue({ rows: mockReservas });

      const result = await reservasResolvers.Query.reservas(null, {}, { pool: mockPool });

      expect(result).toHaveLength(2);
    });

    it('debe filtrar por estado', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, estado: 'confirmada' }] });

      await reservasResolvers.Query.reservas(null, { estado: 'confirmada' }, { pool: mockPool });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('r.estado = $1'),
        ['confirmada']
      );
    });
  });

  // =====================================================================
  // Query: reserva
  // =====================================================================
  describe('Query: reserva', () => {
    it('debe retornar reserva por ID', async () => {
      const mockReserva = { id: 1, codigo: 'RES-20260519-0001' };
      mockPool.query.mockResolvedValue({ rows: [mockReserva] });

      const result = await reservasResolvers.Query.reserva(null, { id: 1 }, { pool: mockPool });

      expect(result.codigo).toBe('RES-20260519-0001');
    });

    it('debe lanzar error si la reserva no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        reservasResolvers.Query.reserva(null, { id: 999 }, { pool: mockPool })
      ).rejects.toThrow('Reserva no encontrada');
    });
  });

  // =====================================================================
  // Mutation: crearReserva
  // =====================================================================
  describe('Mutation: crearReserva', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);

    const validInput = {
      habitacion_id: 1,
      huesped_id: 1,
      fecha_entrada: tomorrow.toISOString().split('T')[0],
      fecha_salida: dayAfter.toISOString().split('T')[0],
      anticipo: 0,
    };

    it('debe crear reserva con datos válidos y cambiar habitación a reservada', async () => {
      // Mocks para transacción
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [{ id: 1, precio_noche: 150000, activa: true }] }) // habitacion
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // huesped
        .mockResolvedValueOnce({ rows: [] }) // conflictos
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // INSERT reserva
        .mockResolvedValueOnce({}) // UPDATE código
        .mockResolvedValueOnce({}) // UPDATE habitación
        .mockResolvedValueOnce({}); // COMMIT

      mockPool.query.mockResolvedValue({ rows: [{ id: 5, codigo: 'RES-20260520-0005', estado: 'pendiente' }] });

      const result = await reservasResolvers.Mutation.crearReserva(
        null, { input: validInput },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('pendiente');
      // Verificar que habitación se cambió a 'reservada'
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("estado = $1"),
        ['reservada', validInput.habitacion_id]
      );
    });

    it('debe lanzar error si la fecha de entrada es en el pasado', async () => {
      // Usar una fecha claramente en el pasado (30 días atrás) para evitar issues de timezone
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [{ id: 1, precio_noche: 100000, activa: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(
        reservasResolvers.Mutation.crearReserva(
          null,
          { input: { ...validInput, fecha_entrada: pastDate.toISOString().split('T')[0] } },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La fecha de entrada no puede ser anterior a hoy');
    });

    it('debe lanzar error si la fecha de salida ≤ fecha de entrada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [{ id: 1, precio_noche: 100000, activa: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(
        reservasResolvers.Mutation.crearReserva(
          null,
          { input: { ...validInput, fecha_salida: validInput.fecha_entrada } },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La fecha de salida debe ser posterior a la fecha de entrada');
    });

    it('debe lanzar error si hay reserva solapada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [{ id: 1, precio_noche: 100000, activa: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 3, codigo: 'RES-EXISTING' }] }); // conflicto

      await expect(
        reservasResolvers.Mutation.crearReserva(
          null, { input: validInput },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La habitación ya tiene una reserva');
    });

    it('debe lanzar error si el anticipo excede el precio total', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [{ id: 1, precio_noche: 100000, activa: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }); // sin conflictos

      await expect(
        reservasResolvers.Mutation.crearReserva(
          null, { input: { ...validInput, anticipo: 999999999 } },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('El anticipo debe ser un número entre 0 y el precio total');
    });

    it('debe lanzar error si la habitación no existe', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [] }); // habitación no encontrada

      await expect(
        reservasResolvers.Mutation.crearReserva(
          null, { input: validInput },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('Habitación no encontrada o inactiva');
    });
  });

  // =====================================================================
  // Mutation: confirmarReserva
  // =====================================================================
  describe('Mutation: confirmarReserva', () => {
    it('debe cambiar estado de pendiente a confirmada', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] }) // SELECT
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'confirmada' }] }); // UPDATE

      const result = await reservasResolvers.Mutation.confirmarReserva(
        null, { id: 1 },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('confirmada');
    });

    it('debe lanzar error si la reserva no está pendiente', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'confirmada' }] });

      await expect(
        reservasResolvers.Mutation.confirmarReserva(null, { id: 1 }, { pool: mockPool, user: { id: 1 } })
      ).rejects.toThrow("No se puede confirmar una reserva en estado 'confirmada'");
    });
  });

  // =====================================================================
  // Mutation: cancelarReserva
  // =====================================================================
  describe('Mutation: cancelarReserva', () => {
    it('debe cancelar reserva y liberar habitación si no hay otras activas', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente', habitacion_id: 5 }] }) // SELECT reserva
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'cancelada' }] }) // UPDATE cancelar
        .mockResolvedValueOnce({ rows: [] }) // otras reservas: ninguna
        .mockResolvedValueOnce({ rows: [] }) // hospedajes activos: ninguno
        .mockResolvedValueOnce({}) // UPDATE habitación a disponible
        .mockResolvedValueOnce({}); // COMMIT

      const result = await reservasResolvers.Mutation.cancelarReserva(
        null, { id: 1, motivo: 'Cambio de planes' },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('cancelada');
    });

    it('debe lanzar error si la reserva ya está cancelada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'cancelada' }] });

      await expect(
        reservasResolvers.Mutation.cancelarReserva(
          null, { id: 1, motivo: 'test' },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La reserva ya está cancelada');
    });

    it('debe lanzar error si la reserva está en_curso', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'en_curso' }] });

      await expect(
        reservasResolvers.Mutation.cancelarReserva(
          null, { id: 1, motivo: 'test' },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow("No se puede cancelar una reserva en estado 'en_curso'");
    });
  });
});
