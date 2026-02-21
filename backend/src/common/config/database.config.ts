/**
 * Database configuration
 */

export function getDatabaseConfig() {
  return {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/postgres?schema=public',
    queryTimeout: 30000, // 30 seconds
    connectionTimeout: 5000, // 5 seconds
  };
}
