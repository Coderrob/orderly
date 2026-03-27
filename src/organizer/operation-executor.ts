import * as path from 'node:path';

import { type OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

import { CollisionResolver } from './collision-resolver';
import type { ICollisionResolver, IOperationExecutor } from './interfaces';
import type { IFileOperation, IOrganizationResult } from './types';

export class OperationExecutor implements IOperationExecutor {
  /**
   * Creates a new OperationExecutor instance
   * @param logger - Logger instance for recording operation details
   * @param dryRun - If true, simulates operations without making actual changes
   * @param config - Optional configuration containing collision resolution and other settings
   * @param collisionResolver - Collision-policy collaborator used before file execution.
   */
  constructor(
    private readonly logger: Readonly<Logger>,
    private readonly dryRun: boolean,
    private readonly config?: Readonly<OrderlyConfig>,
    private readonly collisionResolver: Readonly<ICollisionResolver> = new CollisionResolver(
      logger,
      config
    )
  ) {}

  /**
   * Executes a list of file operations, either as a dry run or actual execution
   * @param operations - Array of file operations to execute
   * @returns Organization result containing success/failure counts and any errors
   */
  execute(operations: readonly IFileOperation[]): IOrganizationResult {
    const result = this.createEmptyResult(operations);

    if (this.dryRun) {
      return this.executeDryRun(operations, result);
    }

    return this.executeReal(operations, result);
  }

  /**
   * Creates an empty organization result initialized with the operations
   * @param operations - Array of file operations to include in the result
   * @returns Empty organization result with zero counts and no errors
   */
  private createEmptyResult(operations: readonly IFileOperation[]): IOrganizationResult {
    return {
      operations: [...operations],
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      skippedOperations: []
    };
  }

  /**
   * Simulates execution of operations without making actual file system changes
   * @param operations - Array of file operations to simulate
   * @param result - Organization result to populate with simulation results
   * @returns Updated organization result with all operations marked as successful
   */
  private executeDryRun(
    operations: readonly IFileOperation[],
    result: Readonly<IOrganizationResult>
  ): IOrganizationResult {
    this.logger.info('DRY RUN: No files will be modified');

    for (const op of operations) {
      this.logger.info(`[DRY RUN] ${op.type}: ${op.originalPath} -> ${op.newPath}`);
    }

    return { ...result, successful: operations.length };
  }

  /**
   * Executes operations with actual file system changes
   * @param operations - Array of file operations to execute
   * @param result - Organization result to populate with execution results
   * @returns Updated organization result with success/failure counts and any errors
   */
  private executeReal(
    operations: readonly IFileOperation[],
    result: Readonly<IOrganizationResult>
  ): IOrganizationResult {
    let currentResult = result;

    for (const operation of operations) {
      currentResult = this.executeOperation(operation, currentResult);
    }

    return currentResult;
  }

  /**
   * Executes a single file operation and updates the result accordingly
   * @param operation - File operation to execute
   * @param result - Organization result to update with execution outcome
   * @returns Updated organization result.
   */
  private executeOperation(
    operation: Readonly<IFileOperation>,
    result: Readonly<IOrganizationResult>
  ): IOrganizationResult {
    try {
      const executionResult = this.performOperation(operation);
      if (executionResult.succeeded) {
        return this.handleSuccessfulOperation(operation, executionResult, result);
      }

      return this.handleSkippedOperation(operation, executionResult, result);
    } catch (error) {
      return this.handleOperationError(operation, error, result);
    }
  }

  /**
   * Records a successful file operation.
   * @param operation - Executed file operation.
   * @param executionResult - Final execution details.
   * @param result - Current organization result.
   * @returns Updated organization result.
   */
  private handleSuccessfulOperation(
    operation: Readonly<IFileOperation>,
    executionResult: Readonly<{
      succeeded: boolean;
      finalPath: string;
      collisionResolved: boolean;
    }>,
    result: Readonly<IOrganizationResult>
  ): IOrganizationResult {
    const reason = executionResult.collisionResolved
      ? `${operation.reason} (collision resolved)`
      : operation.reason;
    this.logger.info(`✓ ${reason}`, {
      from: operation.originalPath,
      to: executionResult.finalPath
    });
    return { ...result, successful: result.successful + 1 };
  }

  /**
   * Records a skipped file operation.
   * @param operation - Skipped file operation.
   * @param executionResult - Final execution details.
   * @param result - Current organization result.
   * @returns Updated organization result.
   */
  private handleSkippedOperation(
    operation: Readonly<IFileOperation>,
    executionResult: Readonly<{ skipReason?: string }>,
    result: Readonly<IOrganizationResult>
  ): IOrganizationResult {
    const skippedOperation = {
      file: operation.originalPath,
      reason: executionResult.skipReason ?? 'Operation skipped'
    };

    return {
      ...result,
      skipped: (result.skipped ?? 0) + 1,
      skippedOperations: [...(result.skippedOperations ?? []), skippedOperation]
    };
  }

  /**
   * Performs the file operation without mutating the original operation object
   * @param operation - The operation to perform
   * @returns An object indicating success, the final path used, and whether collision was resolved
   */
  private performOperation(operation: Readonly<IFileOperation>): {
    succeeded: boolean;
    finalPath: string;
    collisionResolved: boolean;
    skipReason?: string;
  } {
    const collisionResult = this.collisionResolver.resolve(operation);
    if (collisionResult.skipReason) {
      this.logger.warn(collisionResult.skipReason);
      return collisionResult;
    }

    FileSystemUtils.mkdirSync(path.dirname(collisionResult.finalPath));
    FileSystemUtils.renameSync(operation.originalPath, collisionResult.finalPath);
    return collisionResult;
  }

  /**
   * Handles errors that occur during operation execution
   * @param operation - The file operation that encountered an error
   * @param error - The error that occurred
   * @param result - Organization result to update with error information
   * @returns Updated organization result.
   */
  private handleOperationError(
    operation: Readonly<IFileOperation>,
    error: unknown,
    result: Readonly<IOrganizationResult>
  ): IOrganizationResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`✗ Failed to process ${operation.originalPath}`, errorMessage);

    return {
      ...result,
      failed: result.failed + 1,
      errors: [...result.errors, { file: operation.originalPath, error: errorMessage }]
    };
  }
}
