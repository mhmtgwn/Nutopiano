/**
 * Validation utility functions
 */

import { VALIDATION_PATTERNS } from '@/constants';

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

/**
 * Validate Turkish phone number
 */
export function isValidPhone(phone: string): boolean {
  return VALIDATION_PATTERNS.PHONE.test(phone);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  return VALIDATION_PATTERNS.URL.test(url);
}

/**
 * Validate UUID
 */
export function isValidUuid(uuid: string): boolean {
  return VALIDATION_PATTERNS.UUID.test(uuid);
}

/**
 * Check if string is numeric
 */
export function isNumeric(value: string): boolean {
  return VALIDATION_PATTERNS.NUMERIC.test(value);
}

/**
 * Check if value is positive integer
 */
export function isPositiveInteger(value: any): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/**
 * Check if string matches pattern
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): boolean {
  return VALIDATION_PATTERNS.PASSWORD.test(password);
}

/**
 * Get password strength score (0-100)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;

  // Length check
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Character variety
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/\d/.test(password)) strength += 15;
  if (/[@$!%*?&]/.test(password)) strength += 15;

  return Math.min(strength, 100);
}

/**
 * Validate Turkish ID number
 */
export function isValidTurkishId(id: string): boolean {
  return VALIDATION_PATTERNS.TURKISH_ID.test(id);
}

/**
 * Validate Turkish tax number
 */
export function isValidTurkishTaxNumber(taxNumber: string): boolean {
  return VALIDATION_PATTERNS.TURKISH_TAX_NUMBER.test(taxNumber);
}

/**
 * Validate required field
 */
export function isRequired(value: any): boolean {
  return !isEmpty(value);
}

/**
 * Validate min length
 */
export function hasMinLength(value: string, min: number): boolean {
  return value.length >= min;
}

/**
 * Validate max length
 */
export function hasMaxLength(value: string, max: number): boolean {
  return value.length <= max;
}

/**
 * Validate length range
 */
export function hasLengthInRange(value: string, min: number, max: number): boolean {
  return hasMinLength(value, min) && hasMaxLength(value, max);
}

/**
 * Validate min value
 */
export function isMinValue(value: number, min: number): boolean {
  return value >= min;
}

/**
 * Validate max value
 */
export function isMaxValue(value: number, max: number): boolean {
  return value <= max;
}

/**
 * Validate value range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isMinValue(value, min) && isMaxValue(value, max);
}
