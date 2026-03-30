import * as path from 'node:path';

import { IScannedFile } from '../../scanner/interfaces';

interface IKeyPart {
  readonly name: string;
  readonly value: string | number | boolean | null | undefined;
  readonly optional?: boolean;
}

/**
 * Creates a selector that serializes one sorted record key.
 * @param record - Record being serialized.
 * @returns Serialized record-part selector.
 */
function createSerializedRecordPartSelector(
  record: Readonly<Record<string, string>>
): (key: string) => string {
  /**
   * Serializes one sorted record key.
   * @param key - Record key to serialize.
   * @returns Serialized `key:value` fragment.
   */
  function serializeRecordPart(key: string): string {
    return `${key}:${record[key]}`;
  }

  return serializeRecordPart;
}

/**
 * Creates a sorted list of record keys without mutating the source.
 * @param record - Record whose keys should be sorted.
 * @returns Sorted keys.
 */
function createSortedKeys(record: Readonly<Record<string, string>>): readonly string[] {
  let sortedKeys: readonly string[] = [];

  for (const key of Object.keys(record)) {
    sortedKeys = insertSortedKey(sortedKeys, key);
  }

  return sortedKeys;
}

/**
 * Checks support using the file extension derived from the filename.
 * This keeps strategy support rules consistent even when `extension` is stale.
 * @param file - Scanned file to inspect.
 * @param supportedExtensions - Allowed lowercase extensions.
 * @returns True when the file extension is supported.
 */
export function hasSupportedExtension(
  file: Readonly<IScannedFile>,
  supportedExtensions: readonly string[]
): boolean {
  const extension = path.extname(file.filename).toLowerCase();
  return supportedExtensions.includes(extension);
}

/**
 * Inserts a key into an already sorted key list.
 * @param sortedKeys - Existing sorted keys.
 * @param key - Key to insert.
 * @returns New sorted key list.
 */
function insertSortedKey(sortedKeys: readonly string[], key: string): readonly string[] {
  if (sortedKeys.length === 0) {
    return [key];
  }

  const [firstKey, ...remainingKeys] = sortedKeys;
  if (key.localeCompare(firstKey) <= 0) {
    return [key, ...sortedKeys];
  }

  return [firstKey, ...insertSortedKey(remainingKeys, key)];
}

/**
 * Serializes named key parts into a stable pipe-delimited dedupe key.
 * Optional parts are skipped only when their value is nullish.
 * @param parts - Ordered key parts to serialize.
 * @returns Stable dedupe key.
 */
export function serializeKeyParts(parts: readonly IKeyPart[]): string {
  return parts.filter(shouldIncludeKeyPart).map(toSerializedKeyPart).join('|');
}

/**
 * Serializes record entries in key order for stable comparisons.
 * @param record - Record to serialize.
 * @returns Sorted pipe-delimited key-value pairs.
 */
export function serializeSortedRecord(record: Readonly<Record<string, string>>): string {
  return createSortedKeys(record).map(createSerializedRecordPartSelector(record)).join('|');
}

/**
 * Determines whether a key part should be emitted.
 * @param part - Key part to inspect.
 * @returns True when the part is required or has a non-nullish value.
 */
function shouldIncludeKeyPart(part: Readonly<IKeyPart>): boolean {
  return !part.optional || (part.value !== null && part.value !== undefined);
}

/**
 * Converts a key part to its serialized representation.
 * @param part - Key part to serialize.
 * @returns Serialized `name:value` fragment.
 */
function toSerializedKeyPart(part: Readonly<IKeyPart>): string {
  return `${part.name}:${String(part.value)}`;
}
