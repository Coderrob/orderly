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
   *
   * @param logger
   * @param dryRun
   * @param config
   */
  constructor(
    private readonly logger: Logger,
    private readonly dryRun: boolean,
    private readonly config?: OrderlyConfig
  ) {}

  /**
   *
   * @param operations
   */
  execute(operations: IFileOperation[]): IOrganizationResult {
    const result = this.createEmptyResult(operations);

    if (this.dryRun) {
      return this.executeDryRun(operations, result);
    }

    return this.executeReal(operations, result);
  }

  /**
   *
   * @param operations
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
   *
   * @param operations
   * @param result
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
   *
   * @param operations
   * @param result
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
   *
   * @param operation
   * @param result
   */
  private executeOperation(operation: IFileOperation, result: IOrganizationResult): void {
    try {
      const succeeded = this.performOperation(operation);
      if (succeeded) {
        result.successful++;
        this.logger.info(`✓ ${operation.reason}`, {
          from: operation.originalPath,
          to: operation.newPath
        });
      }
      // If not succeeded, operation was skipped - don't increment counters
    } catch (error) {
      this.handleOperationError(operation, error, result);
    }
  }

  /**
   *
   * @param operation
   */
  private performOperation(operation: IFileOperation): boolean {
    let finalTargetPath = operation.newPath;

    const targetDir = path.dirname(finalTargetPath);
    FileSystemUtils.mkdirSync(targetDir);

    // Check for file existence and handle collision resolution
    if (FileSystemUtils.existsSync(finalTargetPath) && finalTargetPath !== operation.originalPath) {
      const resolvedPath = this.resolveCollision(operation, finalTargetPath);
      if (!resolvedPath) {
        // Skip this operation based on strategy
        this.logger.warn(`Skipping ${operation.originalPath} due to collision resolution strategy`);
        return false; // Indicate operation was skipped
      }
      finalTargetPath = resolvedPath;
      operation.newPath = finalTargetPath;
      operation.reason = `${operation.reason} (collision resolved)`;
    }

    FileSystemUtils.renameSync(operation.originalPath, finalTargetPath);
    return true; // Indicate operation succeeded
  }

  /**
   * Resolves a file collision based on the configured strategy
   * @param operation
   * @param targetPath
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
        // Delete the existing file before we proceed with the rename
        // Safety check in case file was deleted between collision detection and resolution
        if (FileSystemUtils.existsSync(targetPath)) {
          FileSystemUtils.unlinkSync(targetPath);
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
   * @param targetPath
   * @returns A suggested alternative filename
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

    // Fallback: append timestamp and random suffix to reduce collision risk
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return path.join(dir, `${nameWithoutExt}-${Date.now()}-${randomSuffix}${ext}`);
  }

  /**
   *
   * @param operation
   * @param error
   * @param result
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
