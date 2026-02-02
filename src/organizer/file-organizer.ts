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
   *
   * @param config
   * @param logger
   * @param baseDirectory
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
   *
   * @param files
   */
  planOperations(files: IScannedFile[]): IFileOperation[] {
    const operations = this.planner.plan(files);
    this.logger.info(`Planned ${operations.length} operations`);
    return operations;
  }

  /**
   *
   * @param operations
   */
  executeOperations(operations: IFileOperation[]): IOrganizationResult {
    return this.executor.execute(operations);
  }
}
