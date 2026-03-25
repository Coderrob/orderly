/**
 * Options controlling empty-directory cleanup.
 */
export interface ICleanOptions {
  /** Preview removals without deleting directories */
  dryRun?: boolean;
  /** Include hidden directories in the cleanup pass */
  includeHidden?: boolean;
  /** Allow removing an empty .orderly directory */
  removeOrderlyDir?: boolean;
}

/**
 * Removed directory record.
 */
export interface IRemovedDirectory {
  readonly path: string;
  readonly dryRun: boolean;
}

/**
 * Cleanup error record.
 */
export interface ICleanError {
  readonly path: string;
  readonly error: string;
}

/**
 * Result of a cleanup pass.
 */
export interface ICleanResult {
  readonly scannedDirectories: number;
  readonly removedDirectories: number;
  readonly skippedDirectories: number;
  readonly removed: readonly IRemovedDirectory[];
  readonly errors: readonly ICleanError[];
}

/**
 * Service interface for removing empty directories.
 */
export interface IEmptyDirectoryCleaner {
  /**
   * Removes empty directories beneath a root directory.
   * @param rootDirectory - Root directory to clean.
   * @param options - Cleaning options.
   * @returns Structured clean result.
   */
  clean(rootDirectory: string, options: Readonly<ICleanOptions>): ICleanResult;
}
