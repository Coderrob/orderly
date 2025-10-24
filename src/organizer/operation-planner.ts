import * as path from 'path';
import { OrderlyConfig } from '../config/types';
import { ScannedFile } from '../scanner/file-scanner';
import { FileOperation } from './file-organizer';
import { NamingUtils } from '../utils/naming';

export class OperationPlanner {
  constructor(
    private config: OrderlyConfig,
    private baseDirectory: string
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

    return { type, originalPath: file.originalPath, newPath, reason };
  }
}
