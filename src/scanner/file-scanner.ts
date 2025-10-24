import * as path from 'node:path';
import { glob } from 'glob';
import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';
import { FileCategorizer } from '../utils/file-categorizer';

export interface ScannedFile {
  originalPath: string;
  filename: string;
  extension: string;
  size: number;
  category?: string;
  targetFolder?: string;
  needsRename: boolean;
  suggestedName?: string;
}

export class FileScanner {
  constructor(
    private config: OrderlyConfig,
    private logger: Logger
  ) {}

  async scan(directory: string): Promise<ScannedFile[]> {
    this.logger.info(`Scanning directory: ${directory}`);

    const files = await this.findFiles(directory);
    this.logger.debug(`Found ${files.length} files`);

    const scannedFiles = this.processFiles(directory, files);
    this.logger.info(`Scanned ${scannedFiles.length} files`);

    return scannedFiles;
  }

  private async findFiles(directory: string): Promise<string[]> {
    const pattern = this.config.includeHidden ? '**/*' : '**/[!.]*';
    return glob(pattern, {
      cwd: directory,
      nodir: true,
      absolute: false,
      ignore: this.config.excludePatterns
    });
  }

  private processFiles(directory: string, files: string[]): ScannedFile[] {
    const scannedFiles: ScannedFile[] = [];

    for (const file of files) {
      const scannedFile = this.processFile(directory, file);
      if (scannedFile) {
        scannedFiles.push(scannedFile);
      }
    }

    return scannedFiles;
  }

  private processFile(directory: string, file: string): ScannedFile | null {
    const fullPath = path.join(directory, file);
    const stats = FileSystemUtils.stat(fullPath);

    if (!stats.isFile()) {
      return null;
    }

    const ext = path.extname(file).toLowerCase();
    const category = FileCategorizer.categorize(ext, file, this.config.categories);

    return {
      originalPath: fullPath,
      filename: path.basename(file),
      extension: ext,
      size: stats.size,
      category: category?.name,
      targetFolder: category?.targetFolder,
      needsRename: false
    };
  }

  getCategorySummary(files: ScannedFile[]): Map<string, number> {
    const summary = new Map<string, number>();

    for (const file of files) {
      const category = file.category || 'uncategorized';
      summary.set(category, (summary.get(category) || 0) + 1);
    }

    return summary;
  }
}
