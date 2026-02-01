import * as path from 'node:path';

import { OrderlyConfig } from '../config/types';
import type { IScannedFile } from '../scanner/interfaces';
import { NamingUtils } from '../utils/naming';

import type { IOperationPlanner } from './interfaces';
import { FileOperationType, type IFileOperation } from './types';

interface TargetPaths {
  targetDir: string;
  targetFilename: string;
}

export class OperationPlanner implements IOperationPlanner {
  /**
   *
   * @param config
   * @param baseDirectory
   */
  constructor(
    private readonly config: OrderlyConfig,
    private readonly baseDirectory: string
  ) {}

  /**
   *
   * @param files
   */
  plan(files: IScannedFile[]): IFileOperation[] {
    const operations: IFileOperation[] = [];

    for (const file of files) {
      const operation = this.planFileOperation(file);
      if (operation) {
        operations.push(operation);
      }
    }

    return operations;
  }

  /**
   *
   * @param file
   */
  private planFileOperation(file: IScannedFile): IFileOperation | null {
    const { targetDir, targetFilename } = this.calculateTargets(file);
    const newPath = path.join(targetDir, targetFilename);

    // Normalize paths for comparison (handles Windows/Unix path separator differences)
    if (path.normalize(newPath) === path.normalize(file.originalPath)) {
      return null;
    }

    return this.createOperation(file, targetFilename, newPath);
  }

  /**
   *
   * @param file
   */
  private calculateTargets(file: IScannedFile): TargetPaths {
    const originalDir = path.dirname(file.originalPath);
    let targetDir = originalDir;
    let targetFilename = file.filename;

    if (file.targetFolder) {
      targetDir = this.config.targetDirectory
        ? path.join(this.config.targetDirectory, file.targetFolder)
        : path.join(this.baseDirectory, file.targetFolder);
    }

    if (NamingUtils.needsRename(file.filename, this.config.namingConvention)) {
      targetFilename = NamingUtils.applyNamingConvention(
        file.filename,
        this.config.namingConvention
      );
    }

    return { targetDir, targetFilename };
  }

  /**
   *
   * @param file
   * @param targetFilename
   * @param newPath
   */
  private createOperation(
    file: IScannedFile,
    targetFilename: string,
    newPath: string
  ): IFileOperation {
    const needsMove = file.targetFolder !== undefined;
    const needsRename = file.filename !== targetFilename;

    let type: FileOperationType;
    let reason: string;

    switch (true) {
      case needsMove && needsRename:
        type = FileOperationType.MOVE_RENAME;
        reason = `Moving to ${file.targetFolder} and renaming to ${targetFilename}`;
        break;
      case needsMove:
        type = FileOperationType.MOVE;
        reason = `Moving to ${file.targetFolder}`;
        break;
      default:
        type = FileOperationType.RENAME;
        reason = `Renaming to ${targetFilename}`;
        break;
    }

    return { type, originalPath: file.originalPath, newPath, reason };
  }
}
