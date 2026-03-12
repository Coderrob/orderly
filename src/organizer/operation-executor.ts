import * as crypto from 'node:crypto';
import * as path from 'node:path';

import { type OrderlyConfig, CollisionResolutionStrategy } from '../config/types';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { IOperationExecutor } from './interfaces';
import type { IFileOperation, IOrganizationResult } from './types';

// Constants for collision resolution
const DEFAULT_COLLISION_STRATEGY = CollisionResolutionStrategy.KEEP_BOTH;
const DEFAULT_RENAME_PATTERN = '{name}-{n}{ext}';
const DEFAULT_MAX_ATTEMPTS = 100;

// Placeholders for rename pattern
const NAME_PLACEHOLDER = '{name}';
const NUMBER_PLACEHOLDER = '{n}';
const EXT_PLACEHOLDER = '{ext}';

export class OperationExecutor implements IOperationExecutor {
  /**
   * Creates a new OperationExecutor instance
   * @param logger - Logger instance for recording operation details
   * @param dryRun - If true, simulates operations without making actual changes
   * @param config - Optional configuration containing collision resolution and other settings
   */
  constructor(
    private readonly logger: Logger,
    private readonly dryRun: boolean,
    private readonly config?: OrderlyConfig
  ) {}

  /**
   * Executes a list of file operations, either as a dry run or actual execution
   * @param operations - Array of file operations to execute
   * @returns Organization result containing success/failure counts and any errors
   */
  execute(operations: IFileOperation[]): IOrganizationResult {
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
  private createEmptyResult(operations: IFileOperation[]): IOrganizationResult {
    return {
      operations,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Simulates execution of operations without making actual file system changes
   * @param operations - Array of file operations to simulate
   * @param result - Organization result to populate with simulation results
   * @returns Updated organization result with all operations marked as successful
   */
  private executeDryRun(
    operations: IFileOperation[],
    result: IOrganizationResult
  ): IOrganizationResult {
    this.logger.info('DRY RUN: No files will be modified');

    for (const op of operations) {
      this.logger.info(`[DRY RUN] ${op.type}: ${op.originalPath} -> ${op.newPath}`);
    }

    result.successful = operations.length;
    // Critical: Return early without executing performOperation
    return result;
  }

  /**
   * Executes operations with actual file system changes
   * @param operations - Array of file operations to execute
   * @param result - Organization result to populate with execution results
   * @returns Updated organization result with success/failure counts and any errors
   */
  private executeReal(
    operations: IFileOperation[],
    result: IOrganizationResult
  ): IOrganizationResult {
    for (const operation of operations) {
      this.executeOperation(operation, result);
    }
    return result;
  }

  /**
   * Executes a single file operation and updates the result accordingly
   * @param operation - File operation to execute
   * @param result - Organization result to update with execution outcome
   */
  private executeOperation(operation: IFileOperation, result: IOrganizationResult): void {
    try {
      const executionResult = this.performOperation(operation);
      if (executionResult.succeeded) {
        result.successful++;
        const reason = executionResult.collisionResolved
          ? `${operation.reason} (collision resolved)`
          : operation.reason;
        this.logger.info(`✓ ${reason}`, {
          from: operation.originalPath,
          to: executionResult.finalPath
        });
      }
      // If not succeeded, operation was skipped - don't increment counters
    } catch (error) {
      this.handleOperationError(operation, error, result);
    }
  }

  /**
   * Performs the file operation without mutating the original operation object
   * @param operation - The operation to perform
   * @returns An object indicating success, the final path used, and whether collision was resolved
   */
  private performOperation(operation: IFileOperation): {
    succeeded: boolean;
    finalPath: string;
    collisionResolved: boolean;
  } {
    let finalTargetPath = operation.newPath;
    let collisionResolved = false;

    const targetDir = path.dirname(finalTargetPath);
    FileSystemUtils.mkdirSync(targetDir);

    // Check for file existence and handle collision resolution
    if (FileSystemUtils.existsSync(finalTargetPath) && finalTargetPath !== operation.originalPath) {
      const resolvedPath = this.resolveCollision(operation, finalTargetPath);
      if (!resolvedPath) {
        // Skip this operation based on strategy
        this.logger.warn(`Skipping ${operation.originalPath} due to collision resolution strategy`);
        return { succeeded: false, finalPath: operation.newPath, collisionResolved: false };
      }
      finalTargetPath = resolvedPath;
      collisionResolved = true;
    }

    FileSystemUtils.renameSync(operation.originalPath, finalTargetPath);
    return { succeeded: true, finalPath: finalTargetPath, collisionResolved };
  }

  /**
   * Resolves a file collision based on the configured strategy
   * @param operation - The file operation that encountered a collision
   * @param targetPath - The target path where the collision occurred
   * @returns The resolved target path, or null to skip the operation
   */
  private resolveCollision(operation: IFileOperation, targetPath: string): string | null {
    const strategy = this.config?.collisionResolution?.strategy || DEFAULT_COLLISION_STRATEGY;

    switch (strategy) {
      case CollisionResolutionStrategy.SKIP:
        return null; // Skip this operation

      case CollisionResolutionStrategy.KEEP_BOTH:
        return this.generateSuggestedName(targetPath);

      case CollisionResolutionStrategy.REPLACE:
        // Warn the user that the existing file will be deleted
        this.logger.warn(
          `REPLACE strategy: deleting existing file to allow replacement`,
          { target: targetPath, source: operation.originalPath }
        );
        // Delete the existing file before we proceed with the rename
        // Safety check in case file was deleted between collision detection and resolution
        if (FileSystemUtils.existsSync(targetPath)) {
          try {
            FileSystemUtils.unlinkSync(targetPath);
          } catch (unlinkError) {
            // If deletion fails (e.g., due to race condition), fall back to keep-both
            this.logger.warn(
              `REPLACE strategy: failed to delete existing file, falling back to keep-both`,
              { target: targetPath, error: unlinkError instanceof Error ? unlinkError.message : String(unlinkError) }
            );
            return this.generateSuggestedName(targetPath);
          }
        }
        return targetPath; // Use original target path

      default:
        this.logger.warn(
          `Unknown collision resolution strategy '${String(strategy)}', falling back to '${DEFAULT_COLLISION_STRATEGY}'`,
          {
            operation: operation.originalPath,
            target: targetPath,
            providedStrategy: strategy,
            validStrategies: Object.values(CollisionResolutionStrategy)
          }
        );
        return this.generateSuggestedName(targetPath);
    }
  }

  /**
   * Generates a suggested alternative filename to resolve collision
   * @param targetPath - The original target path that has a collision
   * @returns A suggested alternative filename that doesn't conflict with existing files
   */
  private generateSuggestedName(targetPath: string): string {
    const dir = path.dirname(targetPath);
    const filename = path.basename(targetPath);
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    // Default pattern: {name}-{n}{ext}
    const renamePattern = this.config?.collisionResolution?.renamePattern || DEFAULT_RENAME_PATTERN;
    const maxAttempts = this.config?.collisionResolution?.maxAttempts || DEFAULT_MAX_ATTEMPTS;

    for (let i = 1; i <= maxAttempts; i++) {
      const suggestedName = renamePattern
        .replace(NAME_PLACEHOLDER, nameWithoutExt)
        .replace(NUMBER_PLACEHOLDER, i.toString())
        .replace(EXT_PLACEHOLDER, ext);

      const suggestedPath = path.join(dir, suggestedName);

      // Check if this suggested name is available
      if (!FileSystemUtils.existsSync(suggestedPath)) {
        return suggestedPath;
      }
    }

    // Fallback: append timestamp and crypto-generated random suffix to reduce collision risk
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    return path.join(dir, `${nameWithoutExt}-${Date.now()}-${randomSuffix}${ext}`);
  }

  /**
   * Handles errors that occur during operation execution
   * @param operation - The file operation that encountered an error
   * @param error - The error that occurred
   * @param result - Organization result to update with error information
   */
  private handleOperationError(
    operation: IFileOperation,
    error: unknown,
    result: IOrganizationResult
  ): void {
    result.failed++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push({
      file: operation.originalPath,
      error: errorMessage
    });
    this.logger.error(`✗ Failed to process ${operation.originalPath}`, errorMessage);
  }
}
