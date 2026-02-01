/**
 * Represents a file discovered during scanning.
 * Contains all metadata needed for organization decisions.
 */
export interface IScannedFile {
  /** Absolute path to the original file location */
  originalPath: string;
  /** File name with extension */
  filename: string;
  /** File extension including the dot (e.g., '.jpg') */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Matched category name, if any */
  category?: string;
  /** Target folder for categorized files */
  targetFolder?: string;
  /** Whether the file needs renaming per naming convention */
  needsRename: boolean;
  /** New filename if renaming is required */
  suggestedName?: string;
}

/**
 * File scanning interface for discovering files to organize.
 */
export interface IFileScanner {
  /**
   * Scans a directory for files to organize.
   * @param directory - Directory path to scan
   * @returns Promise resolving to array of scanned files
   */
  scan(directory: string): Promise<IScannedFile[]>;

  /**
   * Gets a summary of files by category.
   * @param files - Array of scanned files
   * @returns Map of category name to file count
   */
  getCategorySummary(files: IScannedFile[]): Map<string, number>;
}
