import { createHash } from 'crypto';
import { CalculationVersionSeed } from '../contracts';

type JsonLike =
  | null
  | string
  | number
  | boolean
  | JsonLike[]
  | { [key: string]: JsonLike };

const normalize = (value: unknown): JsonLike => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const output: Record<string, JsonLike> = {};
    for (const [key, nestedValue] of entries) {
      output[key] = normalize(nestedValue);
    }
    return output;
  }

  return String(value);
};

export const canonicalStringify = (value: unknown): string =>
  JSON.stringify(normalize(value));

export const buildCalculationVersion = (
  seed: CalculationVersionSeed,
  prefix = 'v1',
): string => {
  const canonicalPayload = canonicalStringify(seed);
  const digest = createHash('sha256').update(canonicalPayload).digest('hex');
  return `${prefix}:${digest}`;
};
