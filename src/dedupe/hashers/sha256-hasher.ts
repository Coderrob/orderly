import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

import { IDedupeHasher } from '../interfaces';

/**
 * SHA-256 file content hasher using Node.js crypto module.
 * Implements IDedupeHasher interface for content-based duplicate detection.
 */
export class Sha256Hasher implements IDedupeHasher {
  /**
   * Computes SHA-256 hash of file contents.
   * Uses streaming to handle large files efficiently.
   * @param filePath - Absolute path to file
   * @returns Hex-encoded hash string
   */
  async sha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', chunk => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', error => {
        reject(error);
      });
    });
  }
}
