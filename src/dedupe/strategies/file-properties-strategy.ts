import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

/**
 * Strategy that detects duplicates based on file system properties.
 * Files with identical properties (timestamps, mime type) are considered duplicates.
 */
export class FilePropertiesStrategy implements IDedupeStrategy {
  readonly name = 'file-properties';
  readonly priority = 30; // Lower priority than content-based strategies

  /**
   * Creates a new FilePropertiesStrategy instance with optional metadata extractor
   * @param metadataExtractor - Metadata extractor instance for property extraction (default: new MetadataExtractor())
   */
  constructor(private readonly metadataExtractor: IMetadataExtractor = new MetadataExtractor()) {}

  /**
   * Supports all files for property-based comparison.
   * @param _file - Scanned file to check support (unused as all files are supported)
   * @returns True, indicating all files are supported by this strategy
   */
  supports(_file: IScannedFile): boolean {
    return true;
  }

  /**
   * Generates a key based on file system properties.
   * Key format: "created:{timestamp}|modified:{timestamp}|mime:{type}|size:{bytes}"
   * @param file - Scanned file to extract properties from
   * @returns Properties key with timestamps, mime type, and file size, or null if properties cannot be determined
   */
  async getKey(file: IScannedFile): Promise<string | null> {
    try {
      const properties = await this.metadataExtractor.extractProperties(file.originalPath);

      if (!properties) {
        return null;
      }

      // Create a key from the properties
      const parts: string[] = [];

      if (properties.createdAt) {
        parts.push(`created:${properties.createdAt.getTime()}`);
      }

      if (properties.modifiedAt) {
        parts.push(`modified:${properties.modifiedAt.getTime()}`);
      }

      if (properties.mimeType) {
        parts.push(`mime:${properties.mimeType}`);
      }

      // Also include file size for additional uniqueness
      parts.push(`size:${file.size}`);

      return parts.join('|');
    } catch {
      return null;
    }
  }
}
