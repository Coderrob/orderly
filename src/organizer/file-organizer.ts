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
  private readonly planner: OperationPlanner;
  private readonly executor: OperationExecutor;

  /**
   * Creates a new FileOrganizer instance
   * @param config - Configuration containing naming convention, target directory, and execution settings
   * @param logger - Logger instance for recording organization operations
   * @param baseDirectory - Base directory for relative path calculations
   */
  constructor(
    private readonly config: OrderlyConfig,
    private readonly logger: Logger,
    baseDirectory: string
  ) {
    this.planner = new OperationPlanner(config, baseDirectory);
    this.executor = new OperationExecutor(logger, config.dryRun, config);
  }

  /**
   * Plans file operations for a list of scanned files
   * @param files - Array of scanned files to plan operations for
   * @returns Array of planned file operations (move, rename, or move-rename)
   */
  planOperations(files: IScannedFile[]): IFileOperation[] {
    const operations = this.planner.plan(files);
    this.logger.info(`Planned ${operations.length} operations`);
    return operations;
  }

  /**
   * Executes a list of file operations
   * @param operations - Array of file operations to execute
   * @returns Organization result containing success/failure counts and any errors
   */
  executeOperations(operations: IFileOperation[]): IOrganizationResult {
    return this.executor.execute(operations);
  }
}
