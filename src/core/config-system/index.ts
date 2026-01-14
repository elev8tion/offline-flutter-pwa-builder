/**
 * Config System
 *
 * Deep merge utilities for config objects with defaults
 */

import { z } from 'zod';

/**
 * Creates a function that deep merges user config with defaults
 * @param defaults The complete default configuration
 * @returns A function that accepts partial config and returns complete config
 *
 * @example
 * const getConfig = withDefaults({ spacing: { xs: 4, sm: 8 }, colors: { primary: "#fff" } });
 * const config = getConfig({ spacing: { xs: 6 } }); // { spacing: { xs: 6, sm: 8 }, colors: { primary: "#fff" } }
 */
export function withDefaults<T>(defaults: T) {
  return (partial?: Partial<T>): T => {
    if (!partial) return { ...defaults } as T;
    return deepMerge(defaults as any, partial as any) as T;
  };
}

/**
 * Deep merge two objects
 * Recursively merges nested objects while preserving all default values
 *
 * @param target The default/target object
 * @param source The partial/source object with overrides
 * @returns Merged object with all properties from target and overrides from source
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Type guard to check if a value is a plain object
 * Excludes arrays, null, and other non-object types
 *
 * @param item Value to check
 * @returns True if item is a plain object
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Makes all properties in a Zod schema optional while preserving the type
 * This is useful for creating partial schemas that can be merged with defaults
 *
 * @param schema The Zod schema to make optional
 * @returns Optional version of the schema
 *
 * @example
 * const configSchema = z.object({ name: z.string(), count: z.number() });
 * const partialSchema = makePartialSchema(configSchema);
 * // partialSchema accepts: {} | { name?: string } | { count?: number } | { name?: string, count?: number }
 */
export function makePartialSchema<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.optional();
}
