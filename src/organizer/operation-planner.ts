import * as path from 'node:path';

import { OrderlyConfig } from '../config/types';
import type { IScannedFile } from '../scanner/interfaces';
import { NamingUtils } from '../utils/naming';

import type { IOperationPlanner } from './interfaces';
import { FileOperationType, type IFileOperation } from './types';

interface ITargetPaths {
  targetDir: string;
  targetFilename: string;
}

/**
 * Computes the destination directory for a scanned file.
 * @param file - The scanned file being planned.
 * @param config - The active organizer configuration.
 * @param baseDirectory - The base directory used for relative target folders.
 * @returns The directory where the file should be placed.
 */
function getOperationMetadata(
  file: Readonly<IScannedFile>,
  targetFilename: string
): Readonly<{ reason: string; type: FileOperationType }> {
  const needsMove = file.targetFolder !== undefined;
  const needsRename = file.filename !== targetFilename;
  return needsMove
    ? needsRename
      ? {
          reason: `Moving to ${file.targetFolder} and renaming to ${targetFilename}`,
          type: FileOperationType.MOVE_RENAME
        }
      : { reason: `Moving to ${file.targetFolder}`, type: FileOperationType.MOVE }
    : { reason: `Renaming to ${targetFilename}`, type: FileOperationType.RENAME };
}

/**
 * Computes the destination filename for a scanned file.
 * @param file - The scanned file being planned.
 * @param config - The active organizer configuration.
 * @param baseDirectory - The base directory used for relative target folders.
 * @returns The directory where the file should be placed.
 */
function getTargetDirectory(
  file: Readonly<IScannedFile>,
  config: Readonly<OrderlyConfig>,
  baseDirectory: string
): string {
  if (!file.targetFolder) {
    return path.dirname(file.originalPath);
  }

  return config.targetDirectory
    ? path.join(config.targetDirectory, file.targetFolder)
    : path.join(baseDirectory, file.targetFolder);
}

/**
 * Checks whether the new path would leave the file unchanged.
 * @param newPath - The proposed destination path.
 * @param originalPath - The file's current path.
 * @returns True when both normalized paths are the same; otherwise false.
 */
function getTargetFilename(file: Readonly<IScannedFile>, config: Readonly<OrderlyConfig>): string {
  return NamingUtils.shouldRename(file.filename, config.namingConvention)
    ? NamingUtils.applyNamingConvention(file.filename, config.namingConvention)
    : file.filename;
}

/**
 * Builds a file operation reason and type from the computed targets.
 * @param file - The scanned file being planned.
 * @param targetFilename - The computed target filename.
 * @returns The operation metadata describing what will change.
 */
function isUnchangedPath(newPath: string, originalPath: string): boolean {
  return path.normalize(newPath) === path.normalize(originalPath);
}

export class OperationPlanner implements IOperationPlanner {
  /**
   * Creates a new OperationPlanner instance
   * @param config - Configuration containing naming convention and target directory settings
   * @param baseDirectory - Base directory for relative path calculations
   */
  constructor(
    private readonly config: Readonly<OrderlyConfig>,
    private readonly baseDirectory: string
  ) {}

  /**
   * Plans file operations for a list of scanned files
   * @param files - Array of scanned files to plan operations for
   * @returns Array of planned file operations (move, rename, or move-rename)
   */
  plan(files: readonly IScannedFile[]): IFileOperation[] {
    let operations: IFileOperation[] = [];

    for (const file of files) {
      const operation = this.planFileOperation(file);
      if (operation !== null) {
        operations = [...operations, operation];
      }
    }

    return operations;
  }

  /**
   * Plans a file operation for a single scanned file
   * @param file - Scanned file to plan operation for
   * @returns File operation if changes are needed, or null if file is already in correct location with correct name
   */
  private planFileOperation(file: Readonly<IScannedFile>): IFileOperation | null {
    const { targetDir, targetFilename } = this.calculateTargets(file);
    const newPath = path.join(targetDir, targetFilename);

    if (isUnchangedPath(newPath, file.originalPath)) {
      return null;
    }

    return this.createOperation(file, targetFilename, newPath);
  }

  /**
   * Calculates target directory and filename for a scanned file
   * @param file - Scanned file to calculate targets for
   * @returns Object containing target directory and target filename
   */
  private calculateTargets(file: Readonly<IScannedFile>): ITargetPaths {
    return {
      targetDir: getTargetDirectory(file, this.config, this.baseDirectory),
      targetFilename: getTargetFilename(file, this.config)
    };
  }

  /**
   * Creates a file operation based on the file and its targets
   * @param file - Scanned file to create operation for
   * @param targetFilename - Target filename after applying naming convention
   * @param newPath - Complete new path for the file
   * @returns File operation with appropriate type and reason
   */
  private createOperation(
    file: Readonly<IScannedFile>,
    targetFilename: string,
    newPath: string
  ): IFileOperation {
    const { reason, type } = getOperationMetadata(file, targetFilename);
    return { type, originalPath: file.originalPath, newPath, reason };
  }
}
