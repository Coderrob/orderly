/**
 * Options that control empty-directory cleaning behavior.
 */
export interface ICleanOptions {
  /** Preview removals without deleting directories */
  readonly dryRun?: boolean;
  /** Include hidden directories such as .cache */
  readonly includeHidden?: boolean;
  /** Allow deletion of an empty .orderly directory */
  readonly removeOrderlyDir?: boolean;
  /** Optional log level for CLI-facing consumers */
  readonly logLevel?: string;
}

/**
 * Record describing a directory selected for removal.
 */
export interface IRemovedDirectory {
  readonly path: string;
  readonly dryRun: boolean;
}

/**
 * Record describing a directory that could not be removed.
 */
export interface ICleanError {
  readonly path: string;
  readonly error: string;
}

/**
 * Result returned from an empty-directory cleaning pass.
 */
export interface ICleanResult {
  readonly scannedDirectories: number;
  readonly removedDirectories: number;
  readonly skippedDirectories: number;
  readonly removed: readonly IRemovedDirectory[];
  readonly errors: readonly ICleanError[];
}

/**
 * Contract for services that remove empty directories.
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
