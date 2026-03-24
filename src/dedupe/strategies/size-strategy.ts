import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy } from '../interfaces';

const SIZE_PRIORITY = 5;

/**
 * File size-based duplicate detection strategy.
 * Compares files by their byte size for potential duplicates.
 */
export class SizeStrategy implements IDedupeStrategy {
  readonly name = 'size';
  readonly priority = SIZE_PRIORITY; // Run early as prefilter

  /**
   * All files have sizes, so this strategy supports all files.
   * @param _file
   * @returns Always true because every scanned file has a size.
   */
  canProcess(_file: Readonly<IScannedFile>): boolean {
    return true;
  }

  /**
   * Returns file size as string key for comparison.
   * @param file
   * @returns The file size converted to a string comparison key.
   */
  getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    return Promise.resolve(String(file.size));
  }
}
