import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Custom assertions for integration tests
 */
export class TestAssertions {
  /**
   * Asserts that a file exists
   * @param filePath - Path to file
   * @param message - Optional error message
   */
  static assertFileExists(filePath: string, message?: string): void {
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    if (!exists) {
      throw new Error(message || `Expected file to exist: ${filePath}`);
    }
  }

  /**
   * Asserts that a file does not exist
   * @param filePath - Path to file
   * @param message - Optional error message
   */
  static assertFileNotExists(filePath: string, message?: string): void {
    const exists = fs.existsSync(filePath);
    if (exists) {
      throw new Error(message || `Expected file to not exist: ${filePath}`);
    }
  }

  /**
   * Asserts that a directory exists
   * @param dirPath - Path to directory
   * @param message - Optional error message
   */
  static assertDirExists(dirPath: string, message?: string): void {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    if (!exists) {
      throw new Error(message || `Expected directory to exist: ${dirPath}`);
    }
  }

  /**
   * Asserts that a directory does not exist
   * @param dirPath - Path to directory
   * @param message - Optional error message
   */
  static assertDirNotExists(dirPath: string, message?: string): void {
    const exists = fs.existsSync(dirPath);
    if (exists) {
      throw new Error(message || `Expected directory to not exist: ${dirPath}`);
    }
  }

  /**
   * Asserts file content matches expected content
   * @param filePath - Path to file
   * @param expectedContent - Expected content
   * @param message - Optional error message
   */
  static assertFileContent(filePath: string, expectedContent: string, message?: string): void {
    this.assertFileExists(filePath);
    const actualContent = fs.readFileSync(filePath, 'utf-8');
    if (actualContent !== expectedContent) {
      throw new Error(
        message ||
          `File content mismatch for ${filePath}.\nExpected: ${expectedContent}\nActual: ${actualContent}`
      );
    }
  }

  /**
   * Asserts file content contains substring
   * @param filePath - Path to file
   * @param substring - Expected substring
   * @param message - Optional error message
   */
  static assertFileContains(filePath: string, substring: string, message?: string): void {
    this.assertFileExists(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(substring)) {
      throw new Error(
        message || `File ${filePath} does not contain expected substring: ${substring}`
      );
    }
  }

  /**
   * Asserts directory contains exact number of files
   * @param dirPath - Directory path
   * @param expectedCount - Expected file count
   * @param message - Optional error message
   */
  static assertFileCount(dirPath: string, expectedCount: number, message?: string): void {
    this.assertDirExists(dirPath);
    const files = this.getFilesRecursive(dirPath);
    if (files.length !== expectedCount) {
      throw new Error(
        message ||
          `Expected ${expectedCount} files in ${dirPath}, but found ${files.length}.\nFiles: ${files.join(', ')}`
      );
    }
  }

  /**
   * Asserts that a directory structure matches expected structure
   * @param dirPath - Base directory path
   * @param expectedFiles - Array of expected relative file paths
   * @param message - Optional error message
   */
  static assertDirectoryStructure(
    dirPath: string,
    expectedFiles: string[],
    message?: string
  ): void {
    this.assertDirExists(dirPath);
    const actualFiles = this.getFilesRecursive(dirPath).sort();
    const expectedSorted = expectedFiles.sort();

    const missingFiles = expectedSorted.filter(f => !actualFiles.includes(f));
    const extraFiles = actualFiles.filter(f => !expectedSorted.includes(f));

    if (missingFiles.length > 0 || extraFiles.length > 0) {
      const errors: string[] = [];
      if (missingFiles.length > 0) {
        errors.push(`Missing files: ${missingFiles.join(', ')}`);
      }
      if (extraFiles.length > 0) {
        errors.push(`Extra files: ${extraFiles.join(', ')}`);
      }
      throw new Error(message || `Directory structure mismatch:\n${errors.join('\n')}`);
    }
  }

  /**
   * Asserts that files in a directory match a pattern
   * @param dirPath - Directory path
   * @param pattern - RegExp pattern
   * @param minMatches - Minimum number of matches expected
   * @param message - Optional error message
   */
  static assertFilesMatchPattern(
    dirPath: string,
    pattern: RegExp,
    minMatches: number = 1,
    message?: string
  ): void {
    this.assertDirExists(dirPath);
    const files = this.getFilesRecursive(dirPath);
    const matches = files.filter(f => pattern.test(f));

    if (matches.length < minMatches) {
      throw new Error(
        message ||
          `Expected at least ${minMatches} files matching ${pattern} in ${dirPath}, found ${matches.length}`
      );
    }
  }

  /**
   * Asserts two files have identical content
   * @param file1 - First file path
   * @param file2 - Second file path
   * @param message - Optional error message
   */
  static assertFilesIdentical(file1: string, file2: string, message?: string): void {
    this.assertFileExists(file1);
    this.assertFileExists(file2);

    const content1 = fs.readFileSync(file1);
    const content2 = fs.readFileSync(file2);

    if (!content1.equals(content2)) {
      throw new Error(message || `Files are not identical: ${file1} and ${file2}`);
    }
  }

  /**
   * Recursively gets all files in a directory
   * @param dirPath - Directory path
   * @returns Array of relative file paths
   */
  private static getFilesRecursive(dirPath: string): string[] {
    const files: string[] = [];

    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          files.push(relativePath);
        }
      });
    };

    walk(dirPath);
    return files;
  }
}
