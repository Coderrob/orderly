import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy } from '../interfaces';

/**
 * Filename-based duplicate detection strategy.
 * Compares files by name, with optional case sensitivity and extension handling.
 */
export class NameStrategy implements IDedupeStrategy {
  readonly name = 'name';
  readonly priority = 10;

  /**
   *
   * @param config
   * @param config.caseSensitive
   * @param config.ignoreExtension
   */
  constructor(
    private readonly config: {
      caseSensitive: boolean;
      ignoreExtension: boolean;
    } = { caseSensitive: false, ignoreExtension: false }
  ) {}

  /**
   * All files have names, so this strategy supports all files.
   * @param _file
   */
  supports(_file: IScannedFile): boolean {
    return true;
  }

  /**
   * Generates a comparable key from the filename.
   * Applies case sensitivity and extension handling based on configuration.
   * @param file
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getKey(file: IScannedFile): Promise<string | null> {
    const name = this.config.ignoreExtension
      ? file.filename.replace(/\.[^/.]+$/, '') // Remove extension
      : file.filename;

    return this.config.caseSensitive ? name : name.toLowerCase();
  }
}
