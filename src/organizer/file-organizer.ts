import * as fs from 'fs';
import * as path from 'path';
import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { ScannedFile } from '../scanner/file-scanner';
import { NamingUtils } from '../utils/naming';

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
  private config: OrderlyConfig;
  private logger: Logger;
  private baseDirectory: string;

  constructor(config: OrderlyConfig, logger: Logger, baseDirectory: string) {
    this.config = config;
    this.logger = logger;
    this.baseDirectory = baseDirectory;
  }

  planOperations(files: ScannedFile[]): FileOperation[] {
    const operations: FileOperation[] = [];

    for (const file of files) {
      const operation = this.planFileOperation(file);
      if (operation) {
        operations.push(operation);
      }
    }

    this.logger.info(`Planned ${operations.length} operations`);
    return operations;
  }

  private planFileOperation(file: ScannedFile): FileOperation | null {
    const originalDir = path.dirname(file.originalPath);
    const originalFilename = file.filename;

    let targetDir = originalDir;
    let targetFilename = originalFilename;

    const needsMove = file.targetFolder !== undefined;
    const needsRename = NamingUtils.needsRename(originalFilename, this.config.namingConvention);

    if (!needsMove && !needsRename) {
      return null;
    }

    if (needsMove && file.targetFolder) {
      targetDir = this.config.targetDirectory 
        ? path.join(this.config.targetDirectory, file.targetFolder)
        : path.join(this.baseDirectory, file.targetFolder);
    }

    if (needsRename) {
      targetFilename = NamingUtils.applyNamingConvention(originalFilename, this.config.namingConvention);
    }

    const newPath = path.join(targetDir, targetFilename);

    if (newPath === file.originalPath) {
      return null;
    }

    let type: 'move' | 'rename' | 'move-rename';
    let reason: string;

    if (needsMove && needsRename) {
      type = 'move-rename';
      reason = `Moving to ${file.targetFolder} and renaming to ${targetFilename}`;
    } else if (needsMove) {
      type = 'move';
      reason = `Moving to ${file.targetFolder}`;
    } else {
      type = 'rename';
      reason = `Renaming to ${targetFilename}`;
    }

    return {
      type,
      originalPath: file.originalPath,
      newPath,
      reason
    };
  }

  async executeOperations(operations: FileOperation[]): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      operations,
      successful: 0,
      failed: 0,
      errors: []
    };

    if (this.config.dryRun) {
      this.logger.info('DRY RUN: No files will be modified');
      for (const op of operations) {
        this.logger.info(`[DRY RUN] ${op.type}: ${op.originalPath} -> ${op.newPath}`);
      }
      result.successful = operations.length;
      return result;
    }

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        result.successful++;
        this.logger.info(`✓ ${operation.reason}`, {
          from: operation.originalPath,
          to: operation.newPath
        });
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          file: operation.originalPath,
          error: errorMessage
        });
        this.logger.error(`✗ Failed to process ${operation.originalPath}`, errorMessage);
      }
    }

    return result;
  }

  private async executeOperation(operation: FileOperation): Promise<void> {
    const targetDir = path.dirname(operation.newPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      this.logger.debug(`Created directory: ${targetDir}`);
    }

    if (fs.existsSync(operation.newPath) && operation.newPath !== operation.originalPath) {
      throw new Error(`Target file already exists: ${operation.newPath}`);
    }

    fs.renameSync(operation.originalPath, operation.newPath);
  }
}
