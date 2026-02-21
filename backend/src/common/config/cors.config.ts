/**
 * CORS configuration
 */

export function getCorsConfig() {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3002'
  )
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && allowedOrigins.includes('*')) {
    throw new Error('ALLOWED_ORIGINS cannot contain "*" in production');
  }

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 3600, // 1 hour
  };
}
