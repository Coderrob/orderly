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
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    for await (const chunk of stream) {
      if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
        hash.update(chunk);
      }
    }

    return hash.digest('hex');
  }
}
