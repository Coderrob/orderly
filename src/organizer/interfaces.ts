import type { IScannedFile } from '../scanner/interfaces';

import type { ICollisionResolutionResult } from './collision-resolver';
import type { IFileOperation, IOrganizationResult } from './types';

/**
 * Main file organization orchestrator interface.
 * Coordinates planning and execution of file operations.
 */
export interface IFileOrganizer {
  /**
   * Plans operations for the given scanned files.
   * @param files - Array of scanned files to process
   * @returns Array of planned file operations
   */
  planOperations(files: readonly IScannedFile[]): IFileOperation[];

  /**
   * Executes the planned file operations.
   * @param operations - Array of operations to execute
   * @returns Result containing success/failure counts and errors
   */
  executeOperations(operations: IFileOperation[]): IOrganizationResult;
}

/**
 * Operation planning interface.
 * Determines what operations to perform on scanned files.
 */
export interface IOperationPlanner {
  /**
   * Plans file operations based on scanned files.
   * @param files - Array of scanned files
   * @returns Array of planned operations
   */
  plan(files: readonly IScannedFile[]): IFileOperation[];
}

/**
 * Operation execution interface.
 * Performs the actual file system operations.
 */
export interface IOperationExecutor {
  /**
   * Executes file operations (move, rename, etc.).
   * @param operations - Array of operations to execute
   * @returns Result with success/failure counts
   */
  execute(operations: readonly IFileOperation[]): IOrganizationResult;
}

/**
 * Collision resolution interface.
 * Resolves destination conflicts before execution.
 */
export interface ICollisionResolver {
  /**
   * Resolves collision handling for a file operation.
   * @param operation - File operation being prepared.
   * @returns Final path details or a skip outcome.
   */
  resolve(operation: Readonly<IFileOperation>): Readonly<ICollisionResolutionResult>;
}
