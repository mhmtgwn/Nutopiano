/**
 * Type-safe environment variables validation
 */

export interface AppConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  port: number;
  apiPrefix: string;
  apiVersion: string;
}

export interface DatabaseConfig {
  url: string;
  queryTimeout: number;
  connectionTimeout: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  algorithm: 'HS256' | 'RS256';
}

export interface CorsConfig {
  origin: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  supportEmail: string;
}

export interface StorageConfig {
  uploadDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export interface AppEnvironment {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cors: CorsConfig;
  mail: MailConfig;
  storage: StorageConfig;
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return parseInt(value, 10);
}

export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.toLowerCase() === 'true';
}
