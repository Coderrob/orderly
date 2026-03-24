import * as path from 'node:path';

import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

const EXIF_PRIORITY = 15;

/**
 * Strategy that detects duplicates based on EXIF metadata.
 * Images with identical EXIF data are considered duplicates.
 */
export class ExifStrategy implements IDedupeStrategy {
  readonly name = 'exif';
  readonly priority = EXIF_PRIORITY; // High priority for metadata-based detection

  private static readonly IMAGE_EXTENSIONS = new Set<string>([
    '.jpg',
    '.jpeg',
    '.png',
    '.tiff',
    '.tif',
    '.raw',
    '.cr2',
    '.nef'
  ]);

  /**
   * Creates a new ExifStrategy instance with optional metadata extractor
   * @param metadataExtractor - Metadata extractor instance for EXIF data extraction (default: new MetadataExtractor())
   */
  constructor(
    private readonly metadataExtractor: Readonly<IMetadataExtractor> = new MetadataExtractor()
  ) {}

  /**
   * Supports image files that typically contain EXIF data.
   * Checks file extension against a predefined set of image formats.
   * @param file - Scanned file to check support
   * @returns True if file is an image format that may contain EXIF data, false otherwise
   */
  canProcess(file: Readonly<IScannedFile>): boolean {
    const ext = path.extname(file.filename).toLowerCase();
    return ExifStrategy.IMAGE_EXTENSIONS.has(ext);
  }

  /**
   * Generates a key based on EXIF metadata.
   * Creates a hash of sorted EXIF key-value pairs for consistent comparison.
   * @param file - Scanned file to extract EXIF data from
   * @returns Serialized EXIF key (pipe-separated key:value pairs), or null if no EXIF data found
   */
  async getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    try {
      const exifData = await this.metadataExtractor.extractExif(file.originalPath);

      if (!exifData || Object.keys(exifData).length === 0) {
        return null;
      }

      const sortedKeys = this.sortKeys(Object.keys(exifData));
      const keyValuePairs = this.buildKeyValuePairs(sortedKeys, exifData);

      return keyValuePairs.join('|');
    } catch {
      return null;
    }
  }

  /**
   * Sorts EXIF keys alphabetically without mutating input.
   * @param keys - Keys to sort
   * @returns Alphabetically sorted keys
   */
  private sortKeys(keys: readonly string[]): readonly string[] {
    if (keys.length === 0) {
      return [];
    }

    const [firstKey, ...remainingKeys] = keys;
    const sortedRemaining = this.sortKeys(remainingKeys);

    return this.insertSortedKey(sortedRemaining, firstKey);
  }

  /**
   * Inserts one key into a sorted key list.
   * @param sortedKeys - Existing sorted keys
   * @param key - Key to insert
   * @returns Updated sorted keys
   */
  private insertSortedKey(sortedKeys: readonly string[], key: string): readonly string[] {
    if (sortedKeys.length === 0) {
      return [key];
    }

    const [firstKey, ...remainingKeys] = sortedKeys;

    if (key.localeCompare(firstKey) <= 0) {
      return [key, ...sortedKeys];
    }

    return [firstKey, ...this.insertSortedKey(remainingKeys, key)];
  }

  /**
   * Converts sorted EXIF keys into key-value pair strings.
   * @param sortedKeys - Sorted EXIF keys
   * @param exifData - EXIF data record
   * @returns Key-value pair strings
   */
  private buildKeyValuePairs(
    sortedKeys: readonly string[],
    exifData: Readonly<Record<string, string>>
  ): readonly string[] {
    if (sortedKeys.length === 0) {
      return [];
    }

    const [firstKey, ...remainingKeys] = sortedKeys;

    return [
      `${firstKey}:${exifData[firstKey]}`,
      ...this.buildKeyValuePairs(remainingKeys, exifData)
    ];
  }
}
