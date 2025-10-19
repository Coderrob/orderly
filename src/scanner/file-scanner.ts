import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import micromatch from 'micromatch';
import { OrderlyConfig, CategoryRule } from '../config/types';
import { Logger } from '../logger/logger';

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
  private config: OrderlyConfig;
  private logger: Logger;

  constructor(config: OrderlyConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async scan(directory: string): Promise<ScannedFile[]> {
    this.logger.info(`Scanning directory: ${directory}`);

    const pattern = this.config.includeHidden ? '**/*' : '**/[!.]*';
    const files = await glob(pattern, {
      cwd: directory,
      nodir: true,
      absolute: false,
      ignore: this.config.excludePatterns
    });

    this.logger.debug(`Found ${files.length} files`);

    const scannedFiles: ScannedFile[] = [];
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);
      
      if (!stats.isFile()) {
        continue;
      }

      const ext = path.extname(file).toLowerCase();
      const category = this.categorizeFile(ext, file);
      
      scannedFiles.push({
        originalPath: fullPath,
        filename: path.basename(file),
        extension: ext,
        size: stats.size,
        category: category?.name,
        targetFolder: category?.targetFolder,
        needsRename: false
      });
    }

    this.logger.info(`Scanned ${scannedFiles.length} files`);
    return scannedFiles;
  }

  private categorizeFile(extension: string, filename: string): CategoryRule | undefined {
    for (const category of this.config.categories) {
      if (category.extensions.includes(extension)) {
        if (category.patterns) {
          if (micromatch.isMatch(filename, category.patterns)) {
            return category;
          }
        } else {
          return category;
        }
      }
    }
    return undefined;
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
