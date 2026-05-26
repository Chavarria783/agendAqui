/**
 * Tests unitarios para el resolver de Autenticación
 * Módulo: Login (Sprint 1)
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authResolvers = require('../resolvers/auth');

// Mock bcrypt y jwt
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const { createMockPool } = require('./helpers/mockPool');

describe('Auth Resolvers', () => {
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ mockPool } = createMockPool());
  });

  // =====================================================================
  // Query: me
  // =====================================================================
  describe('Query: me', () => {
    it('debe retornar los datos del usuario autenticado', async () => {
      const mockUser = {
        id: 1, nombre: 'Juan', apellido: 'Pérez', usuario: 'admin',
        rol: 'admin', email: 'juan@test.com', telefono: '300123', foto_url: null,
        activo: true, created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await authResolvers.Query.me(null, {}, { user: { id: 1 }, pool: mockPool });

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, nombre'),
        [1]
      );
    });

    it('debe lanzar error si no está autenticado', async () => {
      await expect(
        authResolvers.Query.me(null, {}, { user: null, pool: mockPool })
      ).rejects.toThrow('No autenticado');
    });

    it('debe lanzar error si el usuario no existe en BD', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        authResolvers.Query.me(null, {}, { user: { id: 999 }, pool: mockPool })
      ).rejects.toThrow('Error al obtener información del usuario');
    });
  });

  // =====================================================================
  // Mutation: login
  // =====================================================================
  describe('Mutation: login', () => {
    const mockUserRow = {
      id: 1, nombre: 'Juan', apellido: 'Pérez', usuario: 'admin',
      rol: 'admin', email: 'juan@test.com', telefono: '300123',
      foto_url: null, activo: true, created_at: new Date(),
      password: '$2b$10$hashedelpassword',
    };

    it('debe retornar token y usuario con credenciales correctas', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUserRow] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-jwt-token');

      const result = await authResolvers.Mutation.login(
        null,
        { usuario: 'admin', password: '123456' },
        { pool: mockPool }
      );

      expect(result.token).toBe('fake-jwt-token');
      expect(result.user.nombre).toBe('Juan');
      expect(result.user.password).toBeUndefined();
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, usuario: 'admin', rol: 'admin' },
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    it('debe lanzar error si el usuario no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        authResolvers.Mutation.login(null, { usuario: 'noexiste', password: '123' }, { pool: mockPool })
      ).rejects.toThrow('Usuario o contraseña incorrectos');
    });

    it('debe lanzar error si la contraseña es incorrecta', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUserRow] });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authResolvers.Mutation.login(null, { usuario: 'admin', password: 'wrong' }, { pool: mockPool })
      ).rejects.toThrow('Usuario o contraseña incorrectos');
    });
  });

  // =====================================================================
  // Mutation: loginPIN
  // =====================================================================
  describe('Mutation: loginPIN', () => {
    const mockUserRow = {
      id: 2, nombre: 'María', apellido: 'López', usuario: 'recepcion',
      rol: 'recepcionista', email: 'maria@test.com', telefono: '301456',
      foto_url: null, activo: true, created_at: new Date(),
      pin: '1234',
    };

    it('debe retornar token y usuario con PIN válido', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUserRow] });
      jwt.sign.mockReturnValue('fake-pin-token');

      const result = await authResolvers.Mutation.loginPIN(
        null,
        { pin: '1234' },
        { pool: mockPool }
      );

      expect(result.token).toBe('fake-pin-token');
      expect(result.user.nombre).toBe('María');
      expect(result.user.rol).toBe('recepcionista');
    });

    it('debe lanzar error si el PIN es muy corto (< 4 caracteres)', async () => {
      await expect(
        authResolvers.Mutation.loginPIN(null, { pin: '12' }, { pool: mockPool })
      ).rejects.toThrow('PIN inválido');
    });

    it('debe lanzar error si el PIN es muy largo (> 6 caracteres)', async () => {
      await expect(
        authResolvers.Mutation.loginPIN(null, { pin: '1234567' }, { pool: mockPool })
      ).rejects.toThrow('PIN inválido');
    });

    it('debe lanzar error si el PIN no se encuentra', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        authResolvers.Mutation.loginPIN(null, { pin: '9999' }, { pool: mockPool })
      ).rejects.toThrow('PIN incorrecto');
    });
  });

  // =====================================================================
  // Field Resolver: Usuario.nombre_completo
  // =====================================================================
  describe('Field Resolver: Usuario.nombre_completo', () => {
    it('debe retornar nombre + apellido', () => {
      const result = authResolvers.Usuario.nombre_completo({ nombre: 'Juan', apellido: 'Pérez' });
      expect(result).toBe('Juan Pérez');
    });

    it('debe retornar solo nombre si no tiene apellido', () => {
      const result = authResolvers.Usuario.nombre_completo({ nombre: 'Juan', apellido: null });
      expect(result).toBe('Juan');
    });
  });
});
