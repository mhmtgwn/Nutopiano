/**
 * JWT configuration
 */

export function getJwtConfig() {
  return {
    secret: process.env.JWT_SECRET || 'NUTOPIANO_SECRET_KEY',
    expiresIn: '15m', // Access token expiration
    refreshExpiresIn: '7d', // Refresh token expiration
  };
}
