import { ok as assert } from 'node:assert';
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
    assert(fs.existsSync(resolvedPath), new Error(`Directory does not exist: ${resolvedPath}`));
    assert(
      fs.statSync(resolvedPath).isDirectory(),
      new Error(`Path is not a directory: ${resolvedPath}`)
    );
    fs.accessSync(resolvedPath, fs.constants.R_OK);
    return resolvedPath;
  }
}
