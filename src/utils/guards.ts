/**
 * Type guard utility functions for runtime type checking.
 * These functions provide type-safe checks with proper TypeScript narrowing.
 */

/**
 * Returns true when the provided value is a non-null object.
 * Excludes arrays.
 * @param value The value to check
 * @returns True when the value is a non-null object; otherwise false.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns true when the provided value is a string primitive.
 * @param value The value to check
 * @returns True when the value is a string; otherwise false.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Returns true when the provided value is a number.
 * @param value The value to check
 * @returns True when the value is a number; otherwise false.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Returns true when the provided value is a boolean.
 * @param value The value to check
 * @returns True when the value is a boolean; otherwise false.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Returns true when the provided value is an array.
 * @param value The value to check
 * @returns True when the value is an array; otherwise false.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Returns true when the provided value is null or undefined.
 * @param value The value to check
 * @returns True when the value is null or undefined; otherwise false.
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Returns true when the provided value is a primitive type
 * (string, number, boolean, null, undefined, symbol, or bigint).
 * @param value The value to check
 * @returns True when the value is a primitive; otherwise false.
 */
export function isPrimitive(
  value: unknown
): value is string | number | boolean | null | undefined | symbol | bigint {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  );
}
