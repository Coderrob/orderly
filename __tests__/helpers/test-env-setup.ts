import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Interface for test file configuration
 */
export interface ITestFileConfig {
  path: string;
  content?: string;
  size?: number;
}

/**
 * Interface for test directory structure
 */
export interface ITestDirectoryStructure {
  [key: string]: ITestFileConfig | ITestDirectoryStructure;
}

/**
 * Helper class for setting up test environments
 */
export class TestEnvironmentSetup {
  private readonly testDirs: string[] = [];

  /**
   * Creates a temporary test directory
   * @returns Path to the temporary directory
   */
  createTempDir(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orderly-test-'));
    this.testDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Creates a directory structure with files
   * @param baseDir - Base directory to create structure in
   * @param structure - Directory structure configuration
   */
  createStructure(baseDir: string, structure: ITestDirectoryStructure): void {
    Object.entries(structure).forEach(([name, config]) => {
      const fullPath = path.join(baseDir, name);

      if (this.isFileConfig(config)) {
        // Create file
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (config.content !== undefined) {
          fs.writeFileSync(fullPath, config.content, 'utf-8');
        } else if (config.size !== undefined) {
          // Create file with specific size
          const buffer = Buffer.alloc(config.size);
          fs.writeFileSync(fullPath, buffer);
        }
      } else {
        // Create directory
        fs.mkdirSync(fullPath, { recursive: true });
        if (Object.keys(config).length > 0) {
          this.createStructure(fullPath, config);
        }
      }
    });
  }

  /**
   * Creates a test file with specific content
   * @param filePath - Path to the file
   * @param content - File content
   */
  createFile(filePath: string, content: string = ''): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Creates multiple duplicate files (same content)
   * @param baseDir - Base directory
   * @param filePaths - Array of file paths relative to base dir
   * @param content - Content to write to all files
   */
  createDuplicates(baseDir: string, filePaths: string[], content: string): void {
    filePaths.forEach(filePath => {
      const fullPath = path.join(baseDir, filePath);
      this.createFile(fullPath, content);
    });
  }

  /**
   * Reads the directory structure
   * @param dirPath - Directory to read
   * @returns Array of file paths relative to dirPath
   */
  readDirStructure(dirPath: string): string[] {
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
    return files.sort();
  }

  /**
   * Checks if a file exists
   * @param filePath - Path to check
   * @returns True if file exists
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  }

  /**
   * Checks if a directory exists
   * @param dirPath - Path to check
   * @returns True if directory exists
   */
  dirExists(dirPath: string): boolean {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  }

  /**
   * Reads file content
   * @param filePath - Path to file
   * @returns File content
   */
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Gets file stats
   * @param filePath - Path to file
   * @returns File stats
   */
  getFileStats(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  /**
   * Counts files in a directory
   * @param dirPath - Directory path
   * @returns Number of files
   */
  countFiles(dirPath: string): number {
    return this.readDirStructure(dirPath).length;
  }

  /**
   * Cleans up all created test directories
   */
  cleanup(): void {
    this.testDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          // Add retry logic for Windows file locking issues
          fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch (error) {
          // If cleanup fails, log warning but don't fail the test
          // Temp directories will be cleaned up by the OS eventually
          if (error instanceof Error) {
            console.warn(`Warning: Could not clean up test directory ${dir}: ${error.message}`);
          }
        }
      }
    });
    this.testDirs.length = 0;
  }

  /**
   * Type guard to check if config is a file configuration
   * @param config - Configuration to check
   * @returns True if config is a file configuration
   */
  private isFileConfig(
    config: ITestFileConfig | ITestDirectoryStructure
  ): config is ITestFileConfig {
    return 'path' in config || 'content' in config || 'size' in config;
  }
}
