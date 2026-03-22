import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy } from '../interfaces';

/**
 * File size-based duplicate detection strategy.
 * Compares files by their byte size for potential duplicates.
 */
export class SizeStrategy implements IDedupeStrategy {
  readonly name = 'size';
  readonly priority = 5; // Run early as prefilter

  /**
   * All files have sizes, so this strategy supports all files.
   * @param _file
   * @returns Always true because every scanned file has a size.
   */
  supports(_file: IScannedFile): boolean {
    return true;
  }

  /**
   * Returns file size as string key for comparison.
   * @param file
   * @returns The file size converted to a string comparison key.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getKey(file: IScannedFile): Promise<string | null> {
    return String(file.size);
  }
}
