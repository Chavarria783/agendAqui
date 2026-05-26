/**
 * Helper para crear mocks de PostgreSQL pool y contexto GraphQL.
 * Reutilizable en todos los archivos de test del backend.
 */

/**
 * Crea un mock del pool de PostgreSQL con query() y connect() (para transacciones).
 */
function createMockPool() {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
  };

  return { mockPool, mockClient };
}

/**
 * Crea un contexto GraphQL mock con usuario autenticado.
 */
function createMockContext(overrides = {}) {
  const { mockPool } = createMockPool();

  return {
    user: { id: 1, usuario: 'admin', rol: 'admin' },
    pool: mockPool,
    ...overrides,
  };
}

/**
 * Crea un contexto con transacciones (pool.connect → client).
 */
function createMockContextWithClient(overrides = {}) {
  const { mockPool, mockClient } = createMockPool();

  return {
    user: { id: 1, usuario: 'admin', rol: 'admin' },
    pool: mockPool,
    client: mockClient,
    ...overrides,
  };
}

module.exports = {
  createMockPool,
  createMockContext,
  createMockContextWithClient,
};
