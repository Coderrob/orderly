import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

import { serializeKeyParts } from './strategy-helpers';

const FILE_PROPERTIES_PRIORITY = 30;

/**
 * Strategy that detects duplicates based on file system properties.
 * Files with identical properties (timestamps, mime type) are considered duplicates.
 */
export class FilePropertiesStrategy implements IDedupeStrategy {
  readonly name = 'file-properties';
  readonly priority = FILE_PROPERTIES_PRIORITY; // Lower priority than content-based strategies

  /**
   * Creates a new FilePropertiesStrategy instance with optional metadata extractor
   * @param metadataExtractor - Metadata extractor instance for property extraction (default: new MetadataExtractor())
   */
  constructor(
    private readonly metadataExtractor: Readonly<IMetadataExtractor> = new MetadataExtractor()
  ) {}

  /**
   * Supports all files for property-based comparison.
   * @param _file - Scanned file to check support (unused as all files are supported)
   * @returns True, indicating all files are supported by this strategy
   */
  canProcess(_file: Readonly<IScannedFile>): boolean {
    return true;
  }

  /**
   * Generates a key based on file system properties.
   * Key format combines available properties: "created:{timestamp}|modified:{timestamp}|mime:{type}|size:{bytes}"
   * Note: created, modified, and mime parts are optional; only included if available
   * @param file - Scanned file to extract properties from
   * @returns Properties key with timestamps, mime type, and file size, or null if properties cannot be determined
   */
  async getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    try {
      const properties = await this.metadataExtractor.extractProperties(file.originalPath);

      if (!properties) {
        return null;
      }

      return this.buildPropertiesKey(file, properties);
    } catch {
      return null;
    }
  }

  /**
   * Creates a stable key string from file properties.
   * @param file - Input file
   * @param properties - Extracted properties
   * @returns Serialized key
   */
  private buildPropertiesKey(
    file: Readonly<IScannedFile>,
    properties: Readonly<{
      createdAt?: Date;
      modifiedAt?: Date;
      mimeType?: string;
    }>
  ): string {
    return serializeKeyParts([
      { name: 'created', value: properties.createdAt?.getTime(), optional: true },
      { name: 'modified', value: properties.modifiedAt?.getTime(), optional: true },
      { name: 'mime', value: properties.mimeType, optional: true },
      { name: 'size', value: file.size }
    ]);
  }
}
