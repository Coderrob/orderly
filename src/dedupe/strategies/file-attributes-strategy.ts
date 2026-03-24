import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

const FILE_ATTRIBUTES_PRIORITY = 35;

/**
 * Strategy that detects duplicates based on file system attributes.
 * Files with identical attributes (hidden, readonly, system) are considered duplicates.
 */
export class FileAttributesStrategy implements IDedupeStrategy {
  readonly name = 'file-attributes';
  readonly priority = FILE_ATTRIBUTES_PRIORITY; // Lower priority than content-based strategies

  /**
   * Creates a new FileAttributesStrategy instance with optional metadata extractor
   * @param metadataExtractor - Metadata extractor instance for attribute extraction (default: new MetadataExtractor())
   */
  constructor(
    private readonly metadataExtractor: Readonly<IMetadataExtractor> = new MetadataExtractor()
  ) {}

  /**
   * Supports all files for attribute-based comparison.
   * @param _file - Scanned file to check support (unused as all files are supported)
   * @returns True, indicating all files are supported by this strategy
   */
  canProcess(_file: Readonly<IScannedFile>): boolean {
    return true;
  }

  /**
   * Generates a key based on file system attributes.
   * Key format: "hidden:{bool}|readonly:{bool}|system:{bool}"
   * @param file - Scanned file to extract attributes from
   * @returns Attributes key in format "hidden:X|readonly:Y|system:Z", or null if attributes cannot be determined
   */
  async getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    try {
      const attributes = await this.metadataExtractor.extractAttributes(file.originalPath);

      if (!attributes) {
        return null;
      }

      // Create a key from the attributes
      const parts: string[] = [
        `hidden:${attributes.hidden || false}`,
        `readonly:${attributes.readonly || false}`,
        `system:${attributes.system || false}`
      ];

      return parts.join('|');
    } catch {
      return null;
    }
  }
}
