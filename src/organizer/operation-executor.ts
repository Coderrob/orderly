import * as path from 'node:path';
import { FileSystemUtils } from '../utils/file-system-utils';
import { FileOperation, OrganizationResult } from './file-organizer';
import { Logger } from '../logger/logger';

export class OperationExecutor {
  constructor(
    private readonly logger: Logger,
    private readonly dryRun: boolean
  ) {}

  execute(operations: FileOperation[]): OrganizationResult {
    const result = this.createEmptyResult(operations);

    if (this.dryRun) {
      return this.executeDryRun(operations, result);
    }

    return this.executeReal(operations, result);
  }

  private createEmptyResult(operations: FileOperation[]): OrganizationResult {
    return {
      operations,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  private executeDryRun(
    operations: FileOperation[],
    result: OrganizationResult
  ): OrganizationResult {
    this.logger.info('DRY RUN: No files will be modified');

    for (const op of operations) {
      this.logger.info(`[DRY RUN] ${op.type}: ${op.originalPath} -> ${op.newPath}`);
    }

    result.successful = operations.length;
    return result;
  }

  private executeReal(operations: FileOperation[], result: OrganizationResult): OrganizationResult {
    for (const operation of operations) {
      this.executeOperation(operation, result);
    }
    return result;
  }

  private executeOperation(operation: FileOperation, result: OrganizationResult): void {
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

  private performOperation(operation: FileOperation): void {
    const targetDir = path.dirname(operation.newPath);
    FileSystemUtils.mkdirSync(targetDir);

    if (
      FileSystemUtils.existsSync(operation.newPath) &&
      operation.newPath !== operation.originalPath
    ) {
      throw new Error(`Target file already exists: ${operation.newPath}`);
    }

    FileSystemUtils.renameSync(operation.originalPath, operation.newPath);
  }

  private handleOperationError(
    operation: FileOperation,
    error: unknown,
    result: OrganizationResult
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
