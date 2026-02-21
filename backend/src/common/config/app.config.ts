import Joi from 'joi';
import { getEnv, getEnvNumber } from './environment';

export interface ValidatedAppConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  databaseUrl: string;
  allowedOrigins: string;
}

/**
 * Joi schema for environment variable validation.
 * Run at application startup to ensure all required variables are present and valid.
 */
const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  PORT: Joi.number()
    .port()
    .default(3001),
  JWT_SECRET: Joi.string()
    .default('dev_jwt_secret_change_me')
    .error(() => new Error('JWT_SECRET must be a non-empty string')),
  DATABASE_URL: Joi.string()
    .required()
    .error(() => new Error('DATABASE_URL is required')),
  ALLOWED_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://localhost:3002'),
  PUBLIC_BUSINESS_ID: Joi.number()
    .optional(),
  NEXT_PUBLIC_SITE_URL: Joi.string()
    .uri()
    .optional(),
  SITE_URL: Joi.string()
    .uri()
    .optional(),
  SMTP_HOST: Joi.string()
    .optional(),
  SMTP_PORT: Joi.number()
    .port()
    .optional(),
  SMTP_USER: Joi.string()
    .optional(),
  SMTP_PASS: Joi.string()
    .optional(),
  SMTP_FROM: Joi.alternatives()
    .conditional('NODE_ENV', {
      is: 'production',
      then: Joi.string().email().optional(),
      otherwise: Joi.string().optional(),
    })
    .optional(),
  REDIS_URL: Joi.string()
    .uri()
    .optional(),
  SENTRY_DSN: Joi.string()
    .uri()
    .optional(),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number()
    .min(0)
    .max(1)
    .optional(),
  UPLOADS_DIR: Joi.string()
    .optional(),
  S3_ENDPOINT: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  S3_REGION: Joi.string()
    .optional(),
  S3_BUCKET: Joi.string()
    .optional(),
  S3_ACCESS_KEY_ID: Joi.string()
    .optional(),
  S3_SECRET_ACCESS_KEY: Joi.string()
    .optional(),
  S3_FORCE_PATH_STYLE: Joi.string()
    .optional(),
  UPLOADS_PUBLIC_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  // Add other env vars as needed
}).unknown(true); // Allow unknown variables to not break existing code

export function validateEnv(): ValidatedAppConfig {
  // Validate environment variables at startup
  const { error, value: envVars } = envValidationSchema.validate(process.env, {
    abortEarly: false, // Collect all errors
  });

  if (error) {
    const details = (error as unknown as { details?: Array<{ message: string }> })
      .details;
    const messages = Array.isArray(details)
      ? details.map((d) => `- ${d.message}`).join('\n')
      : `- ${error.message}`;
    throw new Error(`Environment variable validation failed:\n${messages}`);
  }

  return {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    port: getEnvNumber('PORT', 3001),
    jwtSecret: getEnv('JWT_SECRET', 'dev_jwt_secret_change_me'),
    databaseUrl: getEnv('DATABASE_URL'),
    allowedOrigins: getEnv(
      'ALLOWED_ORIGINS',
      'http://localhost:3000,http://localhost:3002',
    ),
  };
}
