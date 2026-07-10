process.env.JWT_SECRET = 'test-jwt-secret-integration-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-integration-key';
process.env.JWT_EXPIRES_IN = '8h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db?schema=public';
process.env.NODE_ENV = 'test';
