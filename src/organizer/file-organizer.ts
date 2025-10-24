import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { ScannedFile } from '../scanner/file-scanner';
import { OperationPlanner } from './operation-planner';
import { OperationExecutor } from './operation-executor';

export interface FileOperation {
  type: 'move' | 'rename' | 'move-rename';
  originalPath: string;
  newPath: string;
  reason: string;
}

export interface OrganizationResult {
  operations: FileOperation[];
  successful: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

export class FileOrganizer {
  private readonly planner: OperationPlanner;
  private readonly executor: OperationExecutor;

  constructor(
    private readonly config: OrderlyConfig,
    private readonly logger: Logger,
    baseDirectory: string
  ) {
    this.planner = new OperationPlanner(config, baseDirectory);
    this.executor = new OperationExecutor(logger, config.dryRun);
  }

  planOperations(files: ScannedFile[]): FileOperation[] {
    const operations = this.planner.plan(files);
    this.logger.info(`Planned ${operations.length} operations`);
    return operations;
  }

  executeOperations(operations: FileOperation[]): OrganizationResult {
    return this.executor.execute(operations);
  }
}
