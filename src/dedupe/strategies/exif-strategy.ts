import * as path from 'node:path';

import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

/**
 * Strategy that detects duplicates based on EXIF metadata.
 * Images with identical EXIF data are considered duplicates.
 */
export class ExifStrategy implements IDedupeStrategy {
  readonly name = 'exif';
  readonly priority = 15; // High priority for metadata-based detection

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
  constructor(private readonly metadataExtractor: IMetadataExtractor = new MetadataExtractor()) {}

  /**
   * Supports image files that typically contain EXIF data.
   * Checks file extension against a predefined set of image formats.
   * @param file - Scanned file to check support
   * @returns True if file is an image format that may contain EXIF data, false otherwise
   */
  supports(file: IScannedFile): boolean {
    const ext = path.extname(file.filename).toLowerCase();
    return ExifStrategy.IMAGE_EXTENSIONS.has(ext);
  }

  /**
   * Generates a key based on EXIF metadata.
   * Creates a hash of sorted EXIF key-value pairs for consistent comparison.
   * @param file - Scanned file to extract EXIF data from
   * @returns Serialized EXIF key (pipe-separated key:value pairs), or null if no EXIF data found
   */
  async getKey(file: IScannedFile): Promise<string | null> {
    try {
      const exifData = await this.metadataExtractor.extractExif(file.originalPath);

      if (!exifData || Object.keys(exifData).length === 0) {
        return null;
      }

      // Sort keys to ensure consistent ordering
      const sortedKeys = Object.keys(exifData).sort((a, b) => a.localeCompare(b));
      const keyValuePairs = sortedKeys.map(key => `${key}:${exifData[key]}`);

      return keyValuePairs.join('|');
    } catch {
      return null;
    }
  }
}
