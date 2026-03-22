/**
 * Types of file operations that can be performed.
 */
export enum FileOperationType {
  MOVE = 'move',
  RENAME = 'rename',
  MOVE_RENAME = 'move-rename'
}

/**
 * Represents a planned or executed file operation.
 */
export interface IFileOperation {
  /** Type of operation to perform */
  type: FileOperationType;
  /** Original file path */
  originalPath: string;
  /** New file path after operation */
  newPath: string;
  /** Human-readable reason for the operation */
  reason: string;
}

/**
 * Result of organizing files.
 */
export interface IOrganizationResult {
  /** All operations that were attempted */
  operations: IFileOperation[];
  /** Count of successful operations */
  successful: number;
  /** Count of failed operations */
  failed: number;
  /** Count of skipped operations */
  skipped?: number;
  /** Details of any errors encountered */
  errors: IFileError[];
  /** Details of any operations intentionally skipped */
  skippedOperations?: IFileSkip[];
}

/**
 * Represents an error that occurred during file operations.
 */
export interface IFileError {
  /** File path that caused the error */
  file: string;
  /** Error message */
  error: string;
}

/**
 * Represents an operation that was intentionally skipped.
 */
export interface IFileSkip {
  /** File path that was skipped */
  file: string;
  /** Human-readable reason for the skip */
  reason: string;
}
