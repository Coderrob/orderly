import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy, IDedupeHasher } from '../interfaces';

/**
 * SHA-256 content-based duplicate detection strategy.
 * Most accurate but slowest strategy - compares actual file contents.
 */
export class Sha256Strategy implements IDedupeStrategy {
  readonly name = 'sha256';
  readonly priority = 100; // Run last (expensive)

  /**
   *
   * @param hasher
   */
  constructor(private readonly hasher: IDedupeHasher) {}

  /**
   * All files can be hashed, so this strategy supports all files.
   * @param _file
   */
  supports(_file: IScannedFile): boolean {
    return true;
  }

  /**
   * Computes SHA-256 hash of file contents.
   * Returns null if hashing fails to treat as non-duplicate.
   * @param file
   */
  async getKey(file: IScannedFile): Promise<string | null> {
    try {
      return await this.hasher.sha256(file.originalPath);
    } catch {
      // Treat as non-duplicate on error
      return null;
    }
  }
}
