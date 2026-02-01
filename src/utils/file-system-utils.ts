import * as fs from 'node:fs';
import * as path from 'node:path';

export interface IFileSystemUtils {
  existsSync(filePath: string): boolean;
  readFileSync(filePath: string): string;
  writeFileSync(filePath: string, content: string): void;
  appendFileSync(filePath: string, content: string): void;
  mkdirSync(dirPath: string): void;
  renameSync(oldPath: string, newPath: string): void;
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
   *
   * @param filePath
   * @param content
   */
  static writeFileSync(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!FileSystemUtils.existsSync(dir)) {
      FileSystemUtils.mkdirSync(dir);
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   *
   * @param filePath
   * @param content
   */
  writeFileSync(filePath: string, content: string): void {
    FileSystemUtils.writeFileSync(filePath, content);
  }

  /**
   *
   * @param filePath
   * @param content
   */
  static appendFileSync(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, 'utf8');
  }

  /**
   *
   * @param filePath
   * @param content
   */
  appendFileSync(filePath: string, content: string): void {
    FileSystemUtils.appendFileSync(filePath, content);
  }

  /**
   *
   * @param dirPath
   */
  static mkdirSync(dirPath: string): void {
    if (!FileSystemUtils.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   *
   * @param dirPath
   */
  mkdirSync(dirPath: string): void {
    FileSystemUtils.mkdirSync(dirPath);
  }

  /**
   *
   * @param oldPath
   * @param newPath
   */
  static renameSync(oldPath: string, newPath: string): void {
    fs.renameSync(oldPath, newPath);
  }

  /**
   *
   * @param oldPath
   * @param newPath
   */
  renameSync(oldPath: string, newPath: string): void {
    FileSystemUtils.renameSync(oldPath, newPath);
  }

  /**
   *
   * @param filePath
   */
  static statSync(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  /**
   *
   * @param filePath
   */
  statSync(filePath: string): fs.Stats {
    return FileSystemUtils.statSync(filePath);
  }
}
