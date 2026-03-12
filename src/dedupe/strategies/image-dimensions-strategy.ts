import * as path from 'node:path';

import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { MetadataExtractor } from '../metadata';

/**
 * Strategy that detects duplicates based on image dimensions.
 * Images with identical dimensions are considered duplicates.
 */
export class ImageDimensionsStrategy implements IDedupeStrategy {
  readonly name = 'image-dimensions';
  readonly priority = 20; // Higher priority than basic strategies

  private readonly imageExtensions = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.tiff',
    '.tif'
  ]);

  /**
   * Creates a new ImageDimensionsStrategy instance with optional metadata extractor
   * @param metadataExtractor - Metadata extractor instance for dimension extraction (default: new MetadataExtractor())
   */
  constructor(private readonly metadataExtractor: IMetadataExtractor = new MetadataExtractor()) {}

  /**
   * Supports image files based on extension.
   * Checks file extension against a predefined set of common image formats.
   * @param file - Scanned file to check support
   * @returns True if file is an image format, false otherwise
   */
  supports(file: IScannedFile): boolean {
    const ext = path.extname(file.filename).toLowerCase();
    return this.imageExtensions.has(ext);
  }

  /**
   * Generates a key based on image dimensions.
   * Key format: "width:{width}|height:{height}"
   * @param file - Scanned image file to extract dimensions from
   * @returns Dimension key in format "width:X|height:Y", or null if dimensions cannot be determined
   */
  async getKey(file: IScannedFile): Promise<string | null> {
    try {
      const dimensions = await this.metadataExtractor.extractDimensions(file.originalPath);

      if (!dimensions) {
        return null;
      }

      return `width:${dimensions.width}|height:${dimensions.height}`;
    } catch {
      return null;
    }
  }
}
