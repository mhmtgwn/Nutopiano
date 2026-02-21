/**
 * Date utility functions
 */

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Get difference between two dates in days
 */
export function getDaysDifference(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/**
 * Get difference between two dates in hours
 */
export function getHoursDifference(startDate: Date, endDate: Date): number {
  const msPerHour = 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerHour);
}

/**
 * Get difference between two dates in minutes
 */
export function getMinutesDifference(startDate: Date, endDate: Date): number {
  const msPerMinute = 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerMinute);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = addDays(new Date(), 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  const yesterday = addDays(new Date(), -1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < new Date().getTime();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > new Date().getTime();
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of month
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get start of year
 */
export function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Get end of year
 */
export function getEndOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

/**
 * Get number of days in a month
 */
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Get day name (Turkish)
 */
export function getDayName(date: Date): string {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[date.getDay()];
}

/**
 * Get month name (Turkish)
 */
export function getMonthName(date: Date): string {
  const months = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  return months[date.getMonth()];
}

/**
 * Check if year is leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Parse ISO date string
 */
export function parseDate(dateString: string): Date | null {
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
}

/**
 * Format timestamp to ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Get date range for a specific week
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const current = new Date(date);
  const first = current.getDate() - current.getDay();

  const start = getStartOfDay(new Date(current.setDate(first)));
  const end = getEndOfDay(addDays(start, 6));

  return { start, end };
}
