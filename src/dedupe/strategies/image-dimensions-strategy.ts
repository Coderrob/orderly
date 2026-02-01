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
   *
   * @param metadataExtractor
   */
  constructor(private readonly metadataExtractor: IMetadataExtractor = new MetadataExtractor()) {}

  /**
   * Supports image files based on extension.
   * @param file
   */
  supports(file: IScannedFile): boolean {
    const ext = path.extname(file.filename).toLowerCase();
    return this.imageExtensions.has(ext);
  }

  /**
   * Generates a key based on image dimensions.
   * Key format: "width:{width}|height:{height}"
   * @param file
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
