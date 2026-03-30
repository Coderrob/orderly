/**
 * Creates an empty normalized-options object.
 * @returns Empty normalized options.
 */
function createEmptyOptions<TOptions extends object>(): Partial<TOptions> {
  return {};
}

/**
 * Reads an optional boolean property from an unknown command-options object.
 * @param value - Candidate object value.
 * @param key - Property name to inspect.
 * @returns Boolean property value when present.
 */
export function getOptionalBooleanOption<TKey extends string>(
  value: object,
  ...key: readonly [TKey]
): boolean | undefined {
  const propertyValue: unknown = Reflect.get(value, key[0]);
  return typeof propertyValue === 'boolean' ? propertyValue : undefined;
}

/**
 * Reads an optional string property from an unknown command-options object.
 * @param value - Candidate object value.
 * @param key - Property name to inspect.
 * @returns String property value when present.
 */
export function getOptionalStringOption<TKey extends string>(
  value: object,
  ...key: readonly [TKey]
): string | undefined {
  const propertyValue: unknown = Reflect.get(value, key[0]);
  return typeof propertyValue === 'string' ? propertyValue : undefined;
}

/**
 * Merges normalized option fragments from a list of normalizers.
 * @param value - Candidate options object.
 * @param normalizers - Option normalizers to apply and merge in order.
 * @returns Merged normalized options.
 */
function mergeNormalizedOptionParts<TOptions extends object>(
  value: object,
  normalizers: readonly ((value: object) => Readonly<Partial<TOptions>>)[]
): Partial<TOptions> {
  let normalizedOptions: Partial<TOptions> = createEmptyOptions<TOptions>();
  for (const normalize of normalizers) {
    normalizedOptions = { ...normalizedOptions, ...normalize(value) };
  }

  return normalizedOptions;
}

/**
 * Normalizes an unknown command-options value by merging one or more object normalizers.
 * @param value - Candidate options value.
 * @param normalizers - Object normalizers to merge when the value is an object.
 * @returns Normalized options object.
 */
export function normalizeObjectOptions<TOptions extends object>(
  value: unknown,
  ...normalizers: readonly ((value: object) => Readonly<Partial<TOptions>>)[]
): Readonly<Partial<TOptions>> {
  if (typeof value !== 'object' || value === null) {
    return createEmptyOptions<TOptions>();
  }

  return mergeNormalizedOptionParts(value, normalizers);
}
