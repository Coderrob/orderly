import * as fs from 'node:fs';
import * as path from 'node:path';

import type {
  ICleanError,
  ICleanOptions,
  ICleanResult,
  IEmptyDirectoryCleaner,
  IRemovedDirectory
} from './interfaces';

const DIRECTORY_REMOVED_ERROR_CODE = 'ENOENT';
const DIRECTORY_NOT_EMPTY_ERROR_CODE = 'ENOTEMPTY';
const ORDERLY_DIRECTORY_NAME = '.orderly';

/**
 * Removes empty directories beneath a root path.
 */
export class EmptyDirectoryCleaner implements IEmptyDirectoryCleaner {
  /**
   * Removes empty directories beneath a root directory.
   * @param rootDirectory - Root directory to clean.
   * @param options - Cleaning options.
   * @returns Structured clean result.
   */
  clean(rootDirectory: string, options: Readonly<ICleanOptions>): ICleanResult {
    const candidateDirectories = this.collectCandidateDirectories(rootDirectory, options);
    return this.removeEmptyDirectories(candidateDirectories, options);
  }

  /**
   * Collects removable directory candidates beneath the root.
   * @param rootDirectory - Root directory to walk.
   * @param options - Cleaning options.
   * @returns Candidate directories ordered deepest-first.
   */
  private collectCandidateDirectories(
    rootDirectory: string,
    options: Readonly<ICleanOptions>
  ): readonly string[] {
    return this.sortDirectoriesByDepthDescending(this.collectDirectories(rootDirectory, options));
  }

  /**
   * Collects directory paths beneath the provided parent directory.
   * @param parentDirectory - Directory whose children should be inspected.
   * @param options - Cleaning options.
   * @returns Candidate child directories.
   */
  private collectDirectories(
    parentDirectory: string,
    options: Readonly<ICleanOptions>
  ): readonly string[] {
    let directories: readonly string[] = [];
    const childDirectories = this.getChildDirectories(parentDirectory, options);

    for (const childDirectory of childDirectories) {
      directories = [
        ...directories,
        ...this.collectDirectories(childDirectory, options),
        childDirectory
      ];
    }

    return directories;
  }

  /**
   * Returns child directories that are eligible for traversal.
   * @param parentDirectory - Directory whose children should be inspected.
   * @param options - Cleaning options.
   * @returns Traversable child directories.
   */
  private getChildDirectories(
    parentDirectory: string,
    options: Readonly<ICleanOptions>
  ): readonly string[] {
    return fs
      .readdirSync(parentDirectory, { withFileTypes: true })
      .reduce<
        readonly string[]
      >(this.collectDirectoryEntry.bind(this, parentDirectory, options), []);
  }

  /**
   * Reduces a directory entry into the traversable child-directory list.
   * @param parentDirectory - Directory containing the entry.
   * @param options - Cleaning options.
   * @param directories - Collected child directories.
   * @param entry - Directory entry under inspection.
   * @returns Updated child-directory list.
   */
  private collectDirectoryEntry(
    parentDirectory: string,
    options: Readonly<ICleanOptions>,
    directories: readonly string[],
    entry: Readonly<fs.Dirent>
  ): readonly string[] {
    if (
      !entry.isDirectory() ||
      entry.isSymbolicLink() ||
      this.shouldSkipDirectory(entry.name, options)
    ) {
      return directories;
    }

    return [...directories, path.join(parentDirectory, entry.name)];
  }

  /**
   * Removes empty directories from the candidate list.
   * @param directories - Candidate directories ordered deepest-first.
   * @param options - Cleaning options.
   * @returns Structured clean result.
   */
  private removeEmptyDirectories(
    directories: readonly string[],
    options: Readonly<ICleanOptions>
  ): ICleanResult {
    let removed: readonly IRemovedDirectory[] = [];
    let errors: readonly ICleanError[] = [];
    let skippedDirectories = 0;

    for (const directory of directories) {
      const removalAttempt = this.removeDirectoryIfEmpty(directory, options);
      removed = removalAttempt.removed ? [...removed, removalAttempt.removed] : removed;
      errors = removalAttempt.error ? [...errors, removalAttempt.error] : errors;
      skippedDirectories += removalAttempt.skipped ? 1 : 0;
    }

    return {
      scannedDirectories: directories.length,
      removedDirectories: removed.length,
      skippedDirectories,
      removed,
      errors
    };
  }

  /**
   * Removes a single directory when it is empty.
   * @param directory - Directory to inspect.
   * @param options - Cleaning options.
   * @returns Removal outcome for the directory.
   */
  private removeDirectoryIfEmpty(
    directory: string,
    options: Readonly<ICleanOptions>
  ): Readonly<{
    error?: ICleanError;
    removed?: IRemovedDirectory;
    skipped: boolean;
  }> {
    try {
      if (!this.isDirectoryEmpty(directory)) {
        return { skipped: true };
      }

      if (options.dryRun) {
        return { skipped: false, removed: { path: directory, dryRun: true } };
      }

      fs.rmdirSync(directory);
      return { skipped: false, removed: { path: directory, dryRun: false } };
    } catch (error) {
      return this.isSkippableDirectoryRace(error)
        ? { skipped: true }
        : { skipped: false, error: this.createCleanError(directory, error) };
    }
  }

  /**
   * Returns whether a directory should be skipped entirely.
   * @param directoryName - Directory name to inspect.
   * @param options - Cleaning options.
   * @returns True when the directory should not be traversed or removed.
   */
  private shouldSkipDirectory(directoryName: string, options: Readonly<ICleanOptions>): boolean {
    if (!options.includeHidden && this.isHiddenDirectory(directoryName)) {
      return true;
    }

    return directoryName === ORDERLY_DIRECTORY_NAME && !options.removeOrderlyDir;
  }

  /**
   * Returns whether a directory name is hidden on Unix-style file systems.
   * @param directoryName - Directory name to inspect.
   * @returns True when the directory name begins with a dot.
   */
  private isHiddenDirectory(directoryName: string): boolean {
    return directoryName.startsWith('.');
  }

  /**
   * Returns whether a directory is empty at inspection time.
   * @param directory - Directory path to inspect.
   * @returns True when the directory contains no entries.
   */
  private isDirectoryEmpty(directory: string): boolean {
    return fs.readdirSync(directory).length === 0;
  }

  /**
   * Builds a structured clean error from an unknown thrown value.
   * @param directory - Directory whose removal failed.
   * @param error - Thrown value.
   * @returns Structured clean error.
   */
  private createCleanError(directory: string, error: unknown): ICleanError {
    return {
      path: directory,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  /**
   * Returns whether a directory removal failure should be treated as a skip.
   * @param error - Thrown value.
   * @returns True when the error indicates a benign race.
   */
  private isSkippableDirectoryRace(error: unknown): boolean {
    if (!(error instanceof Error) || !('code' in error)) {
      return false;
    }

    return (
      error.code === DIRECTORY_REMOVED_ERROR_CODE || error.code === DIRECTORY_NOT_EMPTY_ERROR_CODE
    );
  }

  /**
   * Returns directories sorted deepest-first without mutating the source list.
   * @param directories - Directories to sort.
   * @returns Sorted directories.
   */
  private sortDirectoriesByDepthDescending(directories: readonly string[]): readonly string[] {
    let sortedDirectories: readonly string[] = [];

    for (const directory of directories) {
      sortedDirectories = this.insertDirectoryByDepth(sortedDirectories, directory);
    }

    return sortedDirectories;
  }

  /**
   * Inserts a directory into an already depth-sorted list.
   * @param directories - Existing sorted directories.
   * @param directory - Directory to insert.
   * @returns Updated sorted directory list.
   */
  private insertDirectoryByDepth(
    directories: readonly string[],
    directory: string
  ): readonly string[] {
    let insertIndex = -1;

    for (const [index, existingDirectory] of directories.entries()) {
      if (this.getPathDepth(existingDirectory) < this.getPathDepth(directory)) {
        insertIndex = index;
        break;
      }
    }

    return insertIndex === -1
      ? [...directories, directory]
      : [...directories.slice(0, insertIndex), directory, ...directories.slice(insertIndex)];
  }

  /**
   * Returns the depth of a directory path.
   * @param directory - Directory path.
   * @returns Path depth.
   */
  private getPathDepth(directory: string): number {
    return directory.split(path.sep).length;
  }
}
