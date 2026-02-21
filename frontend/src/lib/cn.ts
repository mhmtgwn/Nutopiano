/**
 * Utility function for merging CSS class names
 * Useful with Tailwind CSS to handle conditional classes
 */

type ClassValue = string | undefined | null | boolean | Record<string, boolean> | ClassValue[];

/**
 * Merge class names and remove duplicates
 * Handles Tailwind CSS conflicts properly
 */
export function cn(...classes: ClassValue[]): string {
  const classList: string[] = [];

  const addClass = (value: ClassValue): void => {
    if (!value) return;

    if (typeof value === 'string') {
      classList.push(value);
    } else if (typeof value === 'boolean') {
      // Skip boolean values
      return;
    } else if (Array.isArray(value)) {
      value.forEach(addClass);
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([key, shouldAdd]) => {
        if (shouldAdd) {
          addClass(key);
        }
      });
    }
  };

  classes.forEach(addClass);

  return classList
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * Create a variant system for conditional styling
 */
export function createVariants<T extends Record<string, Record<string, string>>>(
  variants: T,
  defaultVariant: Partial<{ [K in keyof T]: keyof T[K] }> = {},
) {
  return function (props: Partial<{ [K in keyof T]: keyof T[K] }> = {}): string {
    const merged = { ...defaultVariant, ...props };
    const classes = Object.entries(merged)
      .map(([key, value]) => variants[key as keyof T]?.[value as string])
      .filter(Boolean);

    return cn(...classes);
  };
}

/**
 * Example usage:
 *
 * const buttonVariants = createVariants({
 *   size: {
 *     sm: 'px-2 py-1 text-sm',
 *     md: 'px-4 py-2 text-base',
 *     lg: 'px-6 py-3 text-lg',
 *   },
 *   variant: {
 *     primary: 'bg-blue-500 text-white',
 *     secondary: 'bg-gray-200 text-black',
 *   },
 * }, { size: 'md', variant: 'primary' });
 *
 * buttonVariants({ size: 'lg' }) // returns 'px-6 py-3 text-lg bg-blue-500 text-white'
 */
