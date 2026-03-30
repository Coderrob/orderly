import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

import { hasSupportedExtension, serializeKeyParts } from './strategy-helpers';

const IMAGE_DIMENSIONS_PRIORITY = 20;
const IMAGE_DIMENSION_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.tiff',
  '.tif'
];

/**
 * Strategy that detects duplicates based on image dimensions.
 * Images with identical dimensions are considered duplicates.
 */
export class ImageDimensionsStrategy implements IDedupeStrategy {
  readonly name = 'image-dimensions';
  readonly priority = IMAGE_DIMENSIONS_PRIORITY; // Higher priority than basic strategies

  /**
   * Creates a new ImageDimensionsStrategy instance with optional metadata extractor
   * @param metadataExtractor - Metadata extractor instance for dimension extraction (default: new MetadataExtractor())
   */
  constructor(
    private readonly metadataExtractor: Readonly<IMetadataExtractor> = new MetadataExtractor()
  ) {}

  /**
   * Supports image files based on extension.
   * Checks file extension against a predefined set of common image formats.
   * @param file - Scanned file to check support
   * @returns True if file is an image format, false otherwise
   */
  canProcess(file: Readonly<IScannedFile>): boolean {
    return hasSupportedExtension(file, IMAGE_DIMENSION_EXTENSIONS);
  }

  /**
   * Generates a key based on image dimensions.
   * Key format: "width:{width}|height:{height}"
   * @param file - Scanned image file to extract dimensions from
   * @returns Dimension key in format "width:X|height:Y", or null if dimensions cannot be determined
   */
  async getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    try {
      const dimensions = await this.metadataExtractor.extractDimensions(file.originalPath);

      if (!dimensions) {
        return null;
      }

      return serializeKeyParts([
        { name: 'width', value: dimensions.width },
        { name: 'height', value: dimensions.height }
      ]);
    } catch {
      return null;
    }
  }
}
