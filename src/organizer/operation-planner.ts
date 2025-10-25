import * as path from 'node:path';
import { OrderlyConfig } from '../config/types';
import { ScannedFile } from '../scanner/file-scanner';
import { FileOperation, FileOperationType } from './file-organizer';
import { NamingUtils } from '../utils/naming';

export class OperationPlanner {
  constructor(
    private readonly config: OrderlyConfig,
    private readonly baseDirectory: string
  ) {}

  plan(files: ScannedFile[]): FileOperation[] {
    const operations: FileOperation[] = [];

    for (const file of files) {
      const operation = this.planFileOperation(file);
      if (operation) {
        operations.push(operation);
      }
    }

    return operations;
  }

  private planFileOperation(file: ScannedFile): FileOperation | null {
    const { targetDir, targetFilename } = this.calculateTargets(file);
    const newPath = path.join(targetDir, targetFilename);

    // Normalize paths for comparison (handles Windows/Unix path separator differences)
    if (path.normalize(newPath) === path.normalize(file.originalPath)) {
      return null;
    }

    return this.createOperation(file, targetFilename, newPath);
  }

  private calculateTargets(file: ScannedFile): { targetDir: string; targetFilename: string } {
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

  private createOperation(
    file: ScannedFile,
    targetFilename: string,
    newPath: string
  ): FileOperation {
    const needsMove = file.targetFolder !== undefined;
    const needsRename = file.filename !== targetFilename;

    let type: FileOperationType;
    let reason: string;

    if (needsMove && needsRename) {
      type = FileOperationType.MOVE_RENAME;
      reason = `Moving to ${file.targetFolder} and renaming to ${targetFilename}`;
    } else if (needsMove) {
      type = FileOperationType.MOVE;
      reason = `Moving to ${file.targetFolder}`;
    } else {
      type = FileOperationType.RENAME;
      reason = `Renaming to ${targetFilename}`;
    }

    return { type, originalPath: file.originalPath, newPath, reason };
  }
}
