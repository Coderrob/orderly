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
   *
   * @param config
   * @param logger
   */
  constructor(config: OrderlyConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   *
   * @param directory
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
   *
   * @param directory
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
   *
   * @param directory
   * @param files
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
   *
   * @param directory
   * @param file
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
   *
   * @param files
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
