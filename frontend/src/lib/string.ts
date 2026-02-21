/**
 * String utility functions
 */

/**
 * Trim string
 */
export function trim(value: string): string {
  return value.trim();
}

/**
 * Check if string is empty
 */
export function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Capitalize first letter of each word
 */
export function capitalize(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert to uppercase
 */
export function toUpperCase(value: string): string {
  return value.toUpperCase();
}

/**
 * Convert to lowercase
 */
export function toLowerCase(value: string): string {
  return value.toLowerCase();
}

/**
 * Truncate string with suffix
 */
export function truncate(value: string, length: number, suffix: string = '...'): string {
  if (value.length <= length) {
    return value;
  }
  return value.substring(0, length - suffix.length) + suffix;
}

/**
 * Repeat string multiple times
 */
export function repeat(value: string, count: number): string {
  return value.repeat(count);
}

/**
 * Pad string with character on left
 */
export function padStart(value: string, length: number, fillChar: string = ' '): string {
  return value.padStart(length, fillChar);
}

/**
 * Pad string with character on right
 */
export function padEnd(value: string, length: number, fillChar: string = ' '): string {
  return value.padEnd(length, fillChar);
}

/**
 * Replace all occurrences of string
 */
export function replaceAll(value: string, search: string, replace: string): string {
  return value.split(search).join(replace);
}

/**
 * Reverse string
 */
export function reverse(value: string): string {
  return value.split('').reverse().join('');
}

/**
 * Extract numbers from string
 */
export function extractNumbers(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Extract letters from string
 */
export function extractLetters(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '');
}

/**
 * Check if string contains substring
 */
export function contains(value: string, substring: string, caseSensitive: boolean = true): boolean {
  if (caseSensitive) {
    return value.includes(substring);
  }
  return value.toLowerCase().includes(substring.toLowerCase());
}

/**
 * Check if string starts with
 */
export function startsWith(value: string, prefix: string, caseSensitive: boolean = true): boolean {
  if (caseSensitive) {
    return value.startsWith(prefix);
  }
  return value.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Check if string ends with
 */
export function endsWith(value: string, suffix: string, caseSensitive: boolean = true): boolean {
  if (caseSensitive) {
    return value.endsWith(suffix);
  }
  return value.toLowerCase().endsWith(suffix.toLowerCase());
}

/**
 * Convert string to slug
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate random string
 */
export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Count word occurrences
 */
export function countWord(value: string, word: string): number {
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  const matches = value.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Split string to chunks
 */
export function chunk(value: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Convert HTML entities
 */
export function htmlToText(html: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  };
  return html.replace(/&[^;]+;/g, (entity) => map[entity] || entity);
}

/**
 * Escape HTML
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
