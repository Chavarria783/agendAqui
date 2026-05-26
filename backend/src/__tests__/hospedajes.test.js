/**
 * Tests unitarios para el resolver de Hospedajes
 * Módulo: Check-In y Hospedajes (Sprint 3)
 */
const hospedajesResolvers = require('../resolvers/hospedajes');
const { createMockPool } = require('./helpers/mockPool');

// Mock de dependencias externas del resolver
jest.mock('../resolvers/consecutivos', () => ({
  obtenerSiguienteNumero: jest.fn().mockResolvedValue({ numero: 1, prefijo: 'FH' }),
}));
jest.mock('../services/cola-impresion', () => ({
  agregarFacturaACola: jest.fn(),
  construirDatosFactura: jest.fn().mockReturnValue({}),
}));

describe('Hospedajes Resolvers', () => {
  let mockPool, mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ mockPool, mockClient } = createMockPool());
  });

  // =====================================================================
  // Query: hospedajes
  // =====================================================================
  describe('Query: hospedajes', () => {
    it('debe retornar todos los hospedajes', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, codigo: 'HOS-20260519-0001', estado: 'activo' },
          { id: 2, codigo: 'HOS-20260518-0001', estado: 'finalizado' },
        ],
      });

      const result = await hospedajesResolvers.Query.hospedajes(null, {}, { pool: mockPool });
      expect(result).toHaveLength(2);
    });

    it('debe filtrar por estado', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, estado: 'activo' }] });

      await hospedajesResolvers.Query.hospedajes(null, { estado: 'activo' }, { pool: mockPool });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('estado = $1'),
        ['activo']
      );
    });
  });

  // =====================================================================
  // Query: hospedaje
  // =====================================================================
  describe('Query: hospedaje', () => {
    it('debe retornar hospedaje por ID', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, codigo: 'HOS-20260519-0001' }] });

      const result = await hospedajesResolvers.Query.hospedaje(null, { id: 1 }, { pool: mockPool });
      expect(result.codigo).toBe('HOS-20260519-0001');
    });

    it('debe lanzar error si no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        hospedajesResolvers.Query.hospedaje(null, { id: 999 }, { pool: mockPool })
      ).rejects.toThrow('Hospedaje no encontrado');
    });
  });

  // =====================================================================
  // Query: cuentaHospedaje
  // =====================================================================
  describe('Query: cuentaHospedaje', () => {
    it('debe calcular cuenta corriente correctamente', async () => {
      const fechaEntrada = new Date('2026-05-15');
      const fechaSalida = new Date('2026-05-18');

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, codigo: 'HOS-001', precio_noche: '100000',
            fecha_entrada: fechaEntrada, fecha_salida_real: null,
            monto_anticipo: '50000',
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, precio_total: '25000', descripcion: 'Minibar' },
            { id: 2, precio_total: '15000', descripcion: 'Lavandería' },
          ],
        });

      const result = await hospedajesResolvers.Query.cuentaHospedaje(
        null,
        { hospedaje_id: 1, fecha_salida: fechaSalida.toISOString() },
        { pool: mockPool }
      );

      expect(result.noches).toBe(3);
      expect(result.subtotal_hospedaje).toBe(300000); // 3 × 100000
      expect(result.subtotal_consumos).toBe(40000); // 25000 + 15000
      expect(result.total).toBe(340000);
      expect(result.pagado).toBe(50000);
      expect(result.saldo).toBe(290000); // 340000 - 50000
    });
  });

  // =====================================================================
  // Mutation: checkIn (walk-in)
  // =====================================================================
  describe('Mutation: checkIn (walk-in)', () => {
    const today = new Date().toISOString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const validInput = {
      habitacion_id: 1,
      huesped_id: 1,
      fecha_entrada: today,
      fecha_salida_prevista: tomorrow.toISOString(),
      acompanantes: [],
    };

    it('debe crear hospedaje walk-in y ocupar habitación', async () => {
      const mockHospedaje = { id: 1, codigo: 'HOS-20260519-0001', estado: 'activo' };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true, capacidad: 4, precio_noche: 150000 }] }) // habitación
        .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Juan' }] }) // huésped
        .mockResolvedValueOnce({ rows: [mockHospedaje] }) // INSERT hospedaje
        .mockResolvedValueOnce({}) // UPDATE habitación
        .mockResolvedValueOnce({}); // COMMIT

      // Mock TRA config (no activo)
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await hospedajesResolvers.Mutation.checkIn(
        null, { input: validInput },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('activo');
      // Verificar que habitación se marcó como ocupada
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("estado = $1"),
        ['ocupada', 1]
      );
    });

    it('debe lanzar error si la habitación está ocupada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'ocupada', activa: true, capacidad: 2 }] });

      await expect(
        hospedajesResolvers.Mutation.checkIn(
          null, { input: validInput },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La habitación ya está ocupada');
    });

    it('debe lanzar error si la fecha es más de 1 día en el futuro', async () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 5);
      const futuroSalida = new Date();
      futuroSalida.setDate(futuroSalida.getDate() + 7);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true, capacidad: 4, precio_noche: 100000 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // huésped

      await expect(
        hospedajesResolvers.Mutation.checkIn(
          null,
          { input: { ...validInput, fecha_entrada: futuro.toISOString(), fecha_salida_prevista: futuroSalida.toISOString() } },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La fecha de check-in no puede ser más de 1 día en el futuro');
    });

    it('debe lanzar error si se excede la capacidad de la habitación', async () => {
      const inputConAcompanantes = {
        ...validInput,
        acompanantes: [
          { nombre: 'Ana', edad: 30, parentesco: 'esposa' },
          { nombre: 'Pedro', edad: 10, parentesco: 'hijo' },
          { nombre: 'Luis', edad: 8, parentesco: 'hijo' },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true, capacidad: 2, precio_noche: 100000 }] }) // capacidad: 2
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // huésped

      await expect(
        hospedajesResolvers.Mutation.checkIn(
          null, { input: inputConAcompanantes },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La habitación tiene capacidad para 2 persona(s), pero se intentan hospedar 4 persona(s)');
    });

    it('debe lanzar error si el huésped no existe', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true, capacidad: 4, precio_noche: 100000 }] })
        .mockResolvedValueOnce({ rows: [] }); // huésped no existe

      await expect(
        hospedajesResolvers.Mutation.checkIn(
          null, { input: validInput },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('Huésped no encontrado');
    });
  });

  // =====================================================================
  // Mutation: checkIn (desde reserva)
  // =====================================================================
  describe('Mutation: checkIn (desde reserva)', () => {
    it('debe crear hospedaje desde reserva y cambiar reserva a en_curso', async () => {
      const today = new Date().toISOString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      const input = {
        habitacion_id: 1,
        huesped_id: 1,
        reserva_id: 10,
        fecha_entrada: today,
        fecha_salida_prevista: tomorrow.toISOString(),
        acompanantes: [],
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true, capacidad: 4, precio_noche: 150000 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // huésped
        .mockResolvedValueOnce({ rows: [{ id: 10, habitacion_id: 1, huesped_id: 1, estado: 'confirmada', precio_noche: 120000, anticipo: 50000 }] }) // reserva
        .mockResolvedValueOnce({}) // UPDATE reserva → en_curso
        .mockResolvedValueOnce({ rows: [{ id: 1, codigo: 'HOS-20260519-0001', estado: 'activo' }] }) // INSERT hospedaje
        .mockResolvedValueOnce({}) // UPDATE habitación → ocupada
        .mockResolvedValueOnce({}); // COMMIT

      mockPool.query.mockResolvedValue({ rows: [] }); // TRA no activo

      const result = await hospedajesResolvers.Mutation.checkIn(
        null, { input },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('activo');
      // Verificar que reserva se cambió a en_curso
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("estado = $1"),
        ['en_curso', 10]
      );
    });

    it('debe lanzar error si la reserva no está en estado válido', async () => {
      const today = new Date().toISOString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'disponible', activa: true, capacidad: 4, precio_noche: 100000 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // huésped
        .mockResolvedValueOnce({ rows: [{ id: 10, habitacion_id: 1, huesped_id: 1, estado: 'cancelada', precio_noche: 100000, anticipo: 0 }] });

      await expect(
        hospedajesResolvers.Mutation.checkIn(
          null,
          { input: { habitacion_id: 1, huesped_id: 1, reserva_id: 10, fecha_entrada: today, fecha_salida_prevista: tomorrow.toISOString(), acompanantes: [] } },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('La reserva no está en estado válido para check-in');
    });
  });

  // =====================================================================
  // Mutation: cancelarHospedaje
  // =====================================================================
  describe('Mutation: cancelarHospedaje', () => {
    it('debe cancelar hospedaje y liberar habitación', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'activo', habitacion_id: 5, reserva_id: null }] }) // SELECT hospedaje
        .mockResolvedValueOnce({}) // UPDATE hospedaje
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT otros hospedajes activos
        .mockResolvedValueOnce({}) // UPDATE habitación → disponible
        .mockResolvedValueOnce({}); // COMMIT

      // pool.query para re-fetch final después de COMMIT
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, estado: 'cancelado' }] });

      const result = await hospedajesResolvers.Mutation.cancelarHospedaje(
        null, { id: 1, motivo: 'Huésped se retiró' },
        { pool: mockPool, user: { id: 1 } }
      );

      expect(result.estado).toBe('cancelado');
    });

    it('debe lanzar error si el hospedaje no está activo', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'finalizado' }] });

      await expect(
        hospedajesResolvers.Mutation.cancelarHospedaje(
          null, { id: 1, motivo: 'test' },
          { pool: mockPool, user: { id: 1 } }
        )
      ).rejects.toThrow('Solo se pueden cancelar hospedajes activos');
    });
  });

});
