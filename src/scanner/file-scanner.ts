import { basename, extname, join } from 'node:path';

import { glob } from 'glob';

import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileCategorizer } from '../utils/file-categorizer';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { IScannedFile, IFileScanner } from './interfaces';

export type { IScannedFile, IFileScanner } from './interfaces';

export class FileScanner implements IFileScanner {
  private readonly config: OrderlyConfig;
  private readonly logger: Logger;

  /**
   * Creates a new FileScanner instance
   * @param config - Orderly configuration containing file categories and include/exclude patterns
   * @param logger - Logger instance for recording scan operations and debug information
   */
  constructor(config: OrderlyConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Scans a directory and categorizes all files according to configured rules
   * @param directory - The directory path to scan for files
   * @returns Promise resolving to an array of scanned files with categorization information
   */
  async scan(directory: string): Promise<IScannedFile[]> {
    this.logger.info(`Scanning directory: ${directory}`);

    const files = await this.findFiles(directory);
    this.logger.debug(`Found ${files.length} files`);

    const scannedFiles = this.processFiles(directory, files);
    this.logger.info(`Scanned ${scannedFiles.length} files`);

    return scannedFiles;
  }

  /**
   * Finds all files in a directory matching configured patterns
   * @param directory - The directory path to search for files
   * @returns Promise resolving to an array of file paths relative to the directory
   */
  private async findFiles(directory: string): Promise<string[]> {
    const pattern = this.config.includeHidden ? '**/*' : '**/[!.]*';
    return glob(pattern, {
      cwd: directory,
      nodir: true,
      absolute: false,
      ignore: this.config.excludePatterns
    });
  }

  /**
   * Processes multiple files and categorizes each one
   * @param directory - The base directory path for resolving full file paths
   * @param files - Array of relative file paths to process
   * @returns Array of processed and categorized scanned files
   */
  private processFiles(directory: string, files: string[]): IScannedFile[] {
    const scannedFiles: IScannedFile[] = [];

    for (const file of files) {
      const scannedFile = this.processFile(directory, file);
      if (scannedFile) {
        scannedFiles.push(scannedFile);
      }
    }

    return scannedFiles;
  }

  /**
   * Processes a single file by extracting metadata and determining its category
   * @param directory - The base directory path for resolving the full file path
   * @param file - The relative file path to process
   * @returns Scanned file object with metadata and categorization, or null if not a file
   */
  private processFile(directory: string, file: string): IScannedFile | null {
    const fullPath = join(directory, file);
    const stats = FileSystemUtils.statSync(fullPath);

    if (!stats.isFile()) {
      return null;
    }

    const ext = extname(file).toLowerCase();
    const category = FileCategorizer.categorize(ext, file, this.config.categories);

    return {
      originalPath: fullPath,
      filename: basename(file),
      extension: ext,
      size: stats.size,
      category: category?.name,
      targetFolder: category?.targetFolder,
      needsRename: false
    };
  }

  /**
   * Creates a summary of file counts grouped by category
   * @param files - Array of scanned files to summarize
   * @returns Map with category names as keys and file counts as values
   */
  getCategorySummary(files: IScannedFile[]): Map<string, number> {
    const summary = new Map<string, number>();

    for (const file of files) {
      const category = file.category || 'uncategorized';
      summary.set(category, (summary.get(category) || 0) + 1);
    }

    return summary;
  }
}
