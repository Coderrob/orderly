import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import type {
  IScanOptions,
  IScanHandler,
  ICommandResult,
  IConfigService,
  IDirectoryValidator
} from '../interfaces';

/**
 * Handler for the scan command.
 */
export class ScanHandler implements IScanHandler {
  /**
   *
   * @param configService
   * @param directoryValidator
   */
  constructor(
    private readonly configService: IConfigService,
    private readonly directoryValidator: IDirectoryValidator
  ) {}

  /**
   * Executes the scan command.
   * @param directory - Target directory to scan
   * @param options - Scan command options
   * @returns Promise resolving to command result
   */
  async execute(directory: string, options: IScanOptions): Promise<ICommandResult> {
    try {
      // Load configuration
      const config = this.configService.loadWithOverrides(options);

      // Validate and resolve directory
      const targetDir = this.directoryValidator.validate(directory);

      // Create logger
      const logger = new Logger(config.logLevel);

      // Create scanner
      const scanner = new FileScanner(config, logger);

      // Scan files
      const files = await scanner.scan(targetDir);

      // Display results
      this.displayResults(files, scanner, logger);

      return {
        success: true,
        exitCode: 0,
        message: `Found ${files.length} files in ${targetDir}`
      };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        message: `Scan failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Displays scan results to the console.
   * @param files - Scanned files
   * @param scanner - File scanner instance
   * @param logger - Logger instance
   * @param _logger
   */
  private displayResults(files: IScannedFile[], scanner: FileScanner, _logger: Logger): void {
    console.log('\n🗂️  Orderly - File Scan Results\n');

    console.log(`Found ${files.length} files\n`);

    const summary = scanner.getCategorySummary(files);
    console.log('File categories:');
    summary.forEach((count, category) => {
      console.log(`  ${category}: ${count}`);
    });

    if (files.length === 0) {
      return;
    }

    console.log('\nSample files:');
    const sampleFiles = files.slice(0, 5);
    sampleFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.filename} (${file.category || 'uncategorized'})`);
    });

    if (files.length > 5) {
      console.log(`  ... and ${files.length - 5} more files`);
    }
  }
}
