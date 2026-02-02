import * as path from 'node:path';

import { FileExistsError } from '../errors';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { IOperationExecutor } from './interfaces';
import type { IFileOperation, IOrganizationResult } from './types';

export class OperationExecutor implements IOperationExecutor {
  /**
   *
   * @param logger
   * @param dryRun
   */
  constructor(
    private readonly logger: Logger,
    private readonly dryRun: boolean
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
      this.performOperation(operation);
      result.successful++;
      this.logger.info(`✓ ${operation.reason}`, {
        from: operation.originalPath,
        to: operation.newPath
      });
    } catch (error) {
      this.handleOperationError(operation, error, result);
    }
  }

  /**
   *
   * @param operation
   */
  private performOperation(operation: IFileOperation): void {
    const targetDir = path.dirname(operation.newPath);
    FileSystemUtils.mkdirSync(targetDir);

    if (
      FileSystemUtils.existsSync(operation.newPath) &&
      operation.newPath !== operation.originalPath
    ) {
      throw new FileExistsError(operation.newPath);
    }

    FileSystemUtils.renameSync(operation.originalPath, operation.newPath);
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
