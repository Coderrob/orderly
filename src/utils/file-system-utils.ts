import * as fs from 'node:fs';
import * as path from 'node:path';

export interface IFileSystemUtils {
  existsSync(filePath: string): boolean;
  readFileSync(filePath: string): string;
  writeFileSync(filePath: string, content: string): void;
  appendFileSync(filePath: string, content: string): void;
  mkdirSync(dirPath: string): void;
  renameSync(oldPath: string, newPath: string): void;
  unlinkSync(filePath: string): void;
  statSync(filePath: string): fs.Stats;
}

export class FileSystemUtils implements IFileSystemUtils {
  /**
   * Checks if a file or directory exists.
   * @param filePath - The path to check
   * @returns True if the path exists, false otherwise
   */
  static existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Checks if a file or directory exists.
   * @param filePath - The path to check
   * @returns True if the path exists, false otherwise
   */
  existsSync(filePath: string): boolean {
    return FileSystemUtils.existsSync(filePath);
  }

  /**
   * Reads the contents of a file synchronously.
   * @param filePath - The path to the file to read
   * @returns The file contents as a string
   */
  static readFileSync(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Reads the contents of a file synchronously.
   * @param filePath - The path to the file to read
   * @returns The file contents as a string
   */
  readFileSync(filePath: string): string {
    return FileSystemUtils.readFileSync(filePath);
  }

  /**
   * Writes data to a file synchronously.
   * @param filePath - The path to the file to write
   * @param content - The content to write to the file
   */
  static writeFileSync(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!FileSystemUtils.existsSync(dir)) {
      FileSystemUtils.mkdirSync(dir);
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Instance method that writes data to a file synchronously
   * @param filePath - The path to the file to write
   * @param content - The content to write to the file
   */
  writeFileSync(filePath: string, content: string): void {
    FileSystemUtils.writeFileSync(filePath, content);
  }

  /**
   * Appends data to a file synchronously.
   * @param filePath - The path to the file to append to
   * @param content - The content to append to the file
   */
  static appendFileSync(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, 'utf8');
  }

  /**
   * Instance method that appends data to a file synchronously
   * @param filePath - The path to the file to append to
   * @param content - The content to append to the file
   */
  appendFileSync(filePath: string, content: string): void {
    FileSystemUtils.appendFileSync(filePath, content);
  }

  /**
   * Creates a directory synchronously, including any missing parent directories.
   * @param dirPath - The path to the directory to create
   */
  static mkdirSync(dirPath: string): void {
    if (!FileSystemUtils.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Instance method that creates a directory synchronously
   * @param dirPath - The path to the directory to create
   */
  mkdirSync(dirPath: string): void {
    FileSystemUtils.mkdirSync(dirPath);
  }

  /**
   * Renames or moves a file or directory synchronously.
   * @param oldPath - The current path of the file or directory
   * @param newPath - The new path for the file or directory
   */
  static renameSync(oldPath: string, newPath: string): void {
    fs.renameSync(oldPath, newPath);
  }

  /**
   * Instance method that renames or moves a file or directory
   * @param oldPath - The current path of the file or directory
   * @param newPath - The new path for the file or directory
   */
  renameSync(oldPath: string, newPath: string): void {
    FileSystemUtils.renameSync(oldPath, newPath);
  }

  /**
   * Deletes a file synchronously.
   * @param filePath - The path to the file to delete
   */
  static unlinkSync(filePath: string): void {
    fs.unlinkSync(filePath);
  }

  /**
   * Instance method that deletes a file synchronously
   * @param filePath - The path to the file to delete
   */
  unlinkSync(filePath: string): void {
    FileSystemUtils.unlinkSync(filePath);
  }

  /**
   * Retrieves file or directory statistics synchronously.
   * @param filePath - The path to the file or directory
   * @returns File statistics object containing metadata like size, permissions, and timestamps
   */
  static statSync(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  /**
   * Instance method that retrieves file or directory statistics
   * @param filePath - The path to the file or directory
   * @returns File statistics object containing metadata like size, permissions, and timestamps
   */
  statSync(filePath: string): fs.Stats {
    return FileSystemUtils.statSync(filePath);
  }
}
