import * as fs from 'node:fs';
import * as path from 'node:path';

import type { IDirectoryValidator } from '../interfaces';

/**
 * Service for validating directory existence and accessibility.
 */
export class DirectoryValidator implements IDirectoryValidator {
  /**
   * Validates that a directory exists and is accessible.
   * @param directory - Directory path to validate
   * @returns Resolved absolute path if valid
   * @throws Error if directory doesn't exist or is not accessible
   */
  validate(directory: string): string {
    const resolvedPath = path.resolve(directory);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory does not exist: ${resolvedPath}`);
    }

    // Check if it's actually a directory
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`);
    }

    // Check if directory is readable
    try {
      fs.readdirSync(resolvedPath);
    } catch {
      throw new Error(`Directory is not accessible: ${resolvedPath}`);
    }

    return resolvedPath;
  }
}
