import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import type { IScannedFile } from '../scanner/interfaces';

import type { IFileOrganizer } from './interfaces';
import { OperationExecutor } from './operation-executor';
import { OperationPlanner } from './operation-planner';
import type { IFileOperation, IOrganizationResult } from './types';

export { FileOperationType } from './types';
export type { IFileOperation, IOrganizationResult, IFileError } from './types';
export type { IFileOrganizer } from './interfaces';

export class FileOrganizer implements IFileOrganizer {
  /**
   * Creates a new FileOrganizer instance
   * @param config - Configuration containing naming convention, target directory, and execution settings
   * @param logger - Logger instance for recording organization operations
   * @param baseDirectory - Base directory for relative path calculations
   */
  constructor(
    private readonly config: Readonly<OrderlyConfig>,
    private readonly logger: Readonly<Logger>,
    private readonly baseDirectory: string
  ) {}

  /**
   * Plans file operations for a list of scanned files
   * @param files - Array of scanned files to plan operations for
   * @returns Array of planned file operations (move, rename, or move-rename)
   */
  planOperations(files: readonly IScannedFile[]): IFileOperation[] {
    const operations = this.createPlanner().plan(files);
    this.logger.info(`Planned ${operations.length} operations`);
    return operations;
  }

  /**
   * Executes a list of file operations
   * @param operations - Array of file operations to execute
   * @returns Organization result containing success/failure counts and any errors
   */
  executeOperations(operations: readonly IFileOperation[]): IOrganizationResult {
    return this.createExecutor().execute(operations);
  }

  /**
   * Creates an operation planner for the current organizer configuration.
   * @returns Planner configured for this organizer instance.
   */
  private createPlanner(): OperationPlanner {
    return new OperationPlanner(this.config, this.baseDirectory);
  }

  /**
   * Creates an operation executor for the current organizer configuration.
   * @returns Executor configured for this organizer instance.
   */
  private createExecutor(): OperationExecutor {
    return new OperationExecutor(this.logger, this.config.dryRun, this.config);
  }
}
