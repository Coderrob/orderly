import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

import { hasSupportedExtension, serializeSortedRecord } from './strategy-helpers';

const EXIF_PRIORITY = 15;
const EXIF_IMAGE_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.tif',
  '.raw',
  '.cr2',
  '.nef'
];

/**
 * Strategy that detects duplicates based on EXIF metadata.
 * Images with identical EXIF data are considered duplicates.
 */
export class ExifStrategy implements IDedupeStrategy {
  readonly name = 'exif';
  readonly priority = EXIF_PRIORITY; // High priority for metadata-based detection

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
    return hasSupportedExtension(file, EXIF_IMAGE_EXTENSIONS);
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

      return serializeSortedRecord(exifData);
    } catch {
      return null;
    }
  }
}
