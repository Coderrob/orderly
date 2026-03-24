import { IScannedFile } from '../../scanner/interfaces';
import { IDedupeStrategy } from '../interfaces';

const NAME_PRIORITY = 10;

type NameStrategyConfig = Readonly<{
  caseSensitive: boolean;
  ignoreExtension: boolean;
}>;

const DEFAULT_NAME_STRATEGY_CONFIG: NameStrategyConfig = {
  caseSensitive: false,
  ignoreExtension: false
};

/**
 * Filename-based duplicate detection strategy.
 * Compares files by name, with optional case sensitivity and extension handling.
 */
export class NameStrategy implements IDedupeStrategy {
  readonly name = 'name';
  readonly priority = NAME_PRIORITY;

  /**
   * Creates a new NameStrategy instance with optional configuration
   * @param config - Configuration object for case sensitivity and extension handling
   * @param config.caseSensitive - If true, filename comparison is case-sensitive (default: false)
   * @param config.ignoreExtension - If true, file extensions are ignored in comparison (default: false)
   */
  constructor(
    private readonly config: Readonly<NameStrategyConfig> = DEFAULT_NAME_STRATEGY_CONFIG
  ) {}

  /**
   * All files have names, so this strategy supports all files.
   * @param _file - Scanned file to check support (unused as all files are supported)
   * @returns True, indicating all files are supported by this strategy
   */
  canProcess(_file: Readonly<IScannedFile>): boolean {
    return true;
  }

  /**
   * Generates a comparable key from the filename.
   * Applies case sensitivity and extension handling based on configuration.
   * @param file - Scanned file to generate key for
   * @returns Normalized filename key, or null if unable to generate
   */
  getKey(file: Readonly<IScannedFile>): Promise<string | null> {
    const name = this.config.ignoreExtension
      ? file.filename.replace(/\.[^/.]+$/, '') // Remove extension
      : file.filename;

    return Promise.resolve(this.config.caseSensitive ? name : name.toLowerCase());
  }
}
