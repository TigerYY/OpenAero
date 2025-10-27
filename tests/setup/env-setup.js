// Environment setup for tests
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret-key'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = 'redis://localhost:6379'

// Mock environment-specific configurations
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'

// Disable telemetry in tests
process.env.NEXT_TELEMETRY_DISABLED = '1'

// Set test-specific timeouts
process.env.TEST_TIMEOUT = '10000'