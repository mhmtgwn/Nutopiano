/**
 * Validation utilities
 */

/**
 * Email regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turkish phone regex pattern: +905XXXXXXXXX or 05XXXXXXXXX
 */
const PHONE_REGEX = /^(\+90)?5\d{9}$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate Turkish phone format
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON string
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate numeric string
 */
export function isNumeric(str: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(str);
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(num: any): boolean {
  return Number.isInteger(num) && num > 0;
}

export function parsePositiveInteger(value: unknown): number | null {
  const raw = typeof value === 'string' ? value.trim() : value;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i <= 0) return null;
  return i;
}

export function parseBusinessId(value: unknown): number | null {
  return parsePositiveInteger(value);
}
