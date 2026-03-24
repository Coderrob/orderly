import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IDedupeHasher } from '../interfaces';

const SHA256_PRIORITY = 100;

/**
 * SHA-256 content-based duplicate detection strategy.
 * Most accurate but slowest strategy - compares actual file contents.
 */
export class Sha256Strategy implements IDedupeStrategy {
  readonly name = 'sha256';
  readonly priority = SHA256_PRIORITY; // Run last (expensive)

  /**
   * Creates a new Sha256Strategy instance with a hasher implementation
   * @param hasher - Hasher implementation for computing SHA-256 hashes
   */
  constructor(private readonly hasher: Readonly<IDedupeHasher>) {}

  /**
   * All files can be hashed, so this strategy supports all files.
   * @param _file - Scanned file to check support (unused as all files are supported)
   * @returns True, indicating all files are supported by this strategy
   */
  canProcess(_file: Readonly<IScannedFile>): boolean {
    return true;
  }

  /**
   * Computes SHA-256 hash of file contents.
   * Most accurate but slowest duplicate detection method - compares actual file contents.
   * Returns null if hashing fails to treat as non-duplicate.
   * @param file - Scanned file to compute hash for
   * @returns SHA-256 hash of file contents, or null if hashing fails
   */
  async getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    try {
      return await this.hasher.sha256(file.originalPath);
    } catch {
      // Treat as non-duplicate on error
      return null;
    }
  }
}
