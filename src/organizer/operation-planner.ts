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
   * Creates a new OperationPlanner instance
   * @param config - Configuration containing naming convention and target directory settings
   * @param baseDirectory - Base directory for relative path calculations
   */
  constructor(
    private readonly config: OrderlyConfig,
    private readonly baseDirectory: string
  ) {}

  /**
   * Plans file operations for a list of scanned files
   * @param files - Array of scanned files to plan operations for
   * @returns Array of planned file operations (move, rename, or move-rename)
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
   * Plans a file operation for a single scanned file
   * @param file - Scanned file to plan operation for
   * @returns File operation if changes are needed, or null if file is already in correct location with correct name
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
   * Calculates target directory and filename for a scanned file
   * @param file - Scanned file to calculate targets for
   * @returns Object containing target directory and target filename
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
   * Creates a file operation based on the file and its targets
   * @param file - Scanned file to create operation for
   * @param targetFilename - Target filename after applying naming convention
   * @param newPath - Complete new path for the file
   * @returns File operation with appropriate type and reason
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
