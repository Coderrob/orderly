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
   *
   * @param metadataExtractor
   */
  constructor(private readonly metadataExtractor: IMetadataExtractor = new MetadataExtractor()) {}

  /**
   * Supports image files that typically contain EXIF data.
   * @param file
   */
  supports(file: IScannedFile): boolean {
    const ext = path.extname(file.filename).toLowerCase();
    return ExifStrategy.IMAGE_EXTENSIONS.has(ext);
  }

  /**
   * Generates a key based on EXIF metadata.
   * Creates a hash of sorted EXIF key-value pairs.
   * @param file
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
