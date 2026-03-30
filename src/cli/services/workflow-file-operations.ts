import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system-utils';

/**
 * Appends one formatted file-path operation error.
 * @param errors - Existing error messages.
 * @param filePath - File path that failed.
 * @param error - Thrown error.
 * @param toError - Error formatter.
 * @returns Updated error messages.
 */
function appendFilePathError(
  errors: readonly string[],
  filePath: string,
  error: unknown,
  toError: (filePath: string, error: unknown) => string
): readonly string[] {
  return [...errors, toError(filePath, error)];
}

/**
 * Deletes file paths and collects operation failures.
 * @param filePaths - File paths to delete.
 * @param toError - Error formatter.
 * @returns Delete error messages.
 */
export function deleteFilePaths(
  filePaths: readonly string[],
  toError: (filePath: string, error: unknown) => string
): readonly string[] {
  let errors: readonly string[] = [];

  for (const filePath of filePaths) {
    try {
      FileSystemUtils.unlinkSync(filePath);
    } catch (error) {
      errors = appendFilePathError(errors, filePath, error, toError);
    }
  }

  return errors;
}

/**
 * Quarantines file paths and collects operation failures.
 * @param filePaths - File paths to quarantine.
 * @param quarantineDir - Destination quarantine directory.
 * @param resolveDestinationPath - Destination-path resolver.
 * @param toError - Error formatter.
 * @returns Quarantine error messages.
 */
export function quarantineFilePaths(
  filePaths: readonly string[],
  quarantineDir: string,
  resolveDestinationPath: (filePath: string, quarantineDir: string) => string,
  toError: (filePath: string, error: unknown) => string
): readonly string[] {
  let errors: readonly string[] = [];

  for (const filePath of filePaths) {
    try {
      const destinationPath = resolveDestinationPath(filePath, quarantineDir);
      FileSystemUtils.mkdirSync(path.dirname(destinationPath));
      FileSystemUtils.renameSync(filePath, destinationPath);
    } catch (error) {
      errors = appendFilePathError(errors, filePath, error, toError);
    }
  }

  return errors;
}
