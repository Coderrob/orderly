import * as crypto from 'node:crypto';
import * as path from 'node:path';

import { type OrderlyConfig, CollisionResolutionStrategy } from '../config/types';
import { Logger } from '../logger/logger';
import { Clock } from '../utils/clock';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { IOperationExecutor } from './interfaces';
import type { IFileOperation, IOrganizationResult } from './types';

// Constants for collision resolution
const DEFAULT_COLLISION_STRATEGY = CollisionResolutionStrategy.KEEP_BOTH;
const DEFAULT_RENAME_PATTERN = '{name}-{n}{ext}';
const DEFAULT_MAX_ATTEMPTS = 100;
const RANDOM_SUFFIX_LENGTH = 6;

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
    private readonly logger: Readonly<Logger>,
    private readonly dryRun: boolean,
    private readonly config?: Readonly<OrderlyConfig>
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
    const collisionResult = this.getCollisionResult(operation);
    if (collisionResult.skipReason) {
      this.logger.warn(collisionResult.skipReason);
      return collisionResult;
    }

    FileSystemUtils.mkdirSync(path.dirname(collisionResult.finalPath));
    FileSystemUtils.renameSync(operation.originalPath, collisionResult.finalPath);
    return collisionResult;
  }

  /**
   * Resolves collision handling before a rename.
   * @param operation - Operation being prepared.
   * @returns Final path details or a skip outcome.
   */
  private getCollisionResult(operation: Readonly<IFileOperation>): {
    succeeded: boolean;
    finalPath: string;
    collisionResolved: boolean;
    skipReason?: string;
  } {
    if (!this.hasCollision(operation)) {
      return { succeeded: true, finalPath: operation.newPath, collisionResolved: false };
    }

    const resolvedPath = this.resolveCollision(operation, operation.newPath);
    return resolvedPath
      ? { succeeded: true, finalPath: resolvedPath, collisionResolved: true }
      : this.buildSkippedCollisionResult(operation);
  }

  /**
   * Creates the skipped collision result payload.
   * @param operation - Operation being skipped.
   * @returns Skipped collision result.
   */
  private buildSkippedCollisionResult(operation: Readonly<IFileOperation>): {
    succeeded: boolean;
    finalPath: string;
    collisionResolved: boolean;
    skipReason: string;
  } {
    return {
      succeeded: false,
      finalPath: operation.newPath,
      collisionResolved: false,
      skipReason: `Skipping ${operation.originalPath} due to collision resolution strategy`
    };
  }

  /**
   * Checks whether the target path collides with an existing file.
   * @param operation - Operation being evaluated.
   * @returns True when the destination already exists and differs from source.
   */
  private hasCollision(operation: Readonly<IFileOperation>): boolean {
    return (
      FileSystemUtils.hasPath(operation.newPath) && operation.newPath !== operation.originalPath
    );
  }

  /**
   * Resolves a file collision based on the configured strategy
   * @param operation - The file operation that encountered a collision
   * @param targetPath - The target path where the collision occurred
   * @returns The resolved target path, or null to skip the operation
   */
  private resolveCollision(operation: Readonly<IFileOperation>, targetPath: string): string | null {
    const strategy = this.config?.collisionResolution?.strategy || DEFAULT_COLLISION_STRATEGY;
    if (strategy === CollisionResolutionStrategy.SKIP) return null;
    if (strategy === CollisionResolutionStrategy.KEEP_BOTH)
      return this.generateSuggestedName(targetPath);
    return strategy === CollisionResolutionStrategy.REPLACE
      ? this.handleReplaceCollision(operation, targetPath)
      : this.handleUnknownCollisionStrategy(operation, targetPath, strategy);
  }

  /**
   * Handles replacement collision strategy.
   * @param operation - Colliding file operation.
   * @param targetPath - Existing destination path.
   * @returns Target path or a generated fallback path.
   */
  private handleReplaceCollision(operation: Readonly<IFileOperation>, targetPath: string): string {
    this.logger.warn('REPLACE strategy: deleting existing file to allow replacement', {
      target: targetPath,
      source: operation.originalPath
    });

    if (!FileSystemUtils.hasPath(targetPath)) {
      return targetPath;
    }

    return this.tryDeleteCollisionTarget(targetPath);
  }

  /**
   * Deletes the existing collision target or falls back to keep-both.
   * @param targetPath - Existing destination path.
   * @returns A safe target path for the operation.
   */
  private tryDeleteCollisionTarget(targetPath: string): string {
    try {
      FileSystemUtils.unlinkSync(targetPath);
      return targetPath;
    } catch (unlinkError) {
      this.logger.warn(
        'REPLACE strategy: failed to delete existing file, falling back to keep-both',
        {
          target: targetPath,
          error: unlinkError instanceof Error ? unlinkError.message : String(unlinkError)
        }
      );
      return this.generateSuggestedName(targetPath);
    }
  }

  /**
   * Handles invalid collision strategies defensively.
   * @param operation - Colliding file operation.
   * @param targetPath - Existing destination path.
   * @param strategy - Unrecognized configured strategy.
   * @returns A generated safe target path.
   */
  private handleUnknownCollisionStrategy(
    operation: Readonly<IFileOperation>,
    targetPath: string,
    strategy: unknown
  ): string {
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

  /**
   * Generates a suggested alternative filename to resolve collision
   * @param targetPath - The original target path that has a collision
   * @returns A suggested alternative filename that doesn't conflict with existing files
   */
  private generateSuggestedName(targetPath: string): string {
    const targetParts = this.getTargetPathParts(targetPath);
    const availablePath = this.findAvailableSuggestedPath({
      dir: targetParts.dir,
      nameWithoutExt: targetParts.nameWithoutExt,
      ext: targetParts.ext,
      renamePattern: this.config?.collisionResolution?.renamePattern || DEFAULT_RENAME_PATTERN,
      maxAttempts: this.config?.collisionResolution?.maxAttempts || DEFAULT_MAX_ATTEMPTS
    });
    if (availablePath) return availablePath;
    return this.buildFallbackSuggestedPath(targetParts);
  }

  /**
   * Splits a target path into reusable naming parts.
   * @param targetPath - Path being resolved.
   * @returns Parsed path parts.
   */
  private getTargetPathParts(targetPath: string): Readonly<{
    dir: string;
    ext: string;
    nameWithoutExt: string;
  }> {
    const filename = path.basename(targetPath);
    const ext = path.extname(filename);
    return { dir: path.dirname(targetPath), ext, nameWithoutExt: path.basename(filename, ext) };
  }

  /**
   * Searches for the first available keep-both filename.
   * @param dir - Destination directory.
   * @param nameWithoutExt - Base filename without extension.
   * @param ext - Original extension.
   * @param renamePattern - Pattern used for numbering collisions.
   * @param maxAttempts - Maximum numbered attempts.
   * @returns Available path when found; otherwise null.
   */
  private findAvailableSuggestedPath(
    options: Readonly<{
      dir: string;
      nameWithoutExt: string;
      ext: string;
      renamePattern: string;
      maxAttempts: number;
    }>
  ): string | null {
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      const suggestedPath = path.join(
        options.dir,
        this.buildSuggestedName(options.renamePattern, options.nameWithoutExt, options.ext, attempt)
      );
      if (!FileSystemUtils.hasPath(suggestedPath)) {
        return suggestedPath;
      }
    }

    return null;
  }

  /**
   * Creates a random suffix for collision fallback names.
   * @returns Hex-like random suffix.
   */
  private createRandomSuffix(): string {
    return crypto.randomUUID().replaceAll('-', '').slice(0, RANDOM_SUFFIX_LENGTH);
  }

  /**
   * Builds the final fallback collision filename.
   * @param targetParts - Parsed path parts for the colliding file.
   * @returns Fallback path with monotonic token and random suffix.
   */
  private buildFallbackSuggestedPath(
    targetParts: Readonly<{
      dir: string;
      ext: string;
      nameWithoutExt: string;
    }>
  ): string {
    return path.join(
      targetParts.dir,
      `${targetParts.nameWithoutExt}-${Clock.nowMonotonicToken()}-${this.createRandomSuffix()}${targetParts.ext}`
    );
  }

  /**
   * Builds a numbered collision filename.
   * @param renamePattern - Pattern used for numbering collisions.
   * @param nameWithoutExt - Base filename without extension.
   * @param ext - Original extension.
   * @param attempt - Attempt index.
   * @returns Suggested filename.
   */
  private buildSuggestedName(
    renamePattern: string,
    nameWithoutExt: string,
    ext: string,
    attempt: number
  ): string {
    return renamePattern
      .replace(NAME_PLACEHOLDER, nameWithoutExt)
      .replace(NUMBER_PLACEHOLDER, String(attempt))
      .replace(EXT_PLACEHOLDER, ext);
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
