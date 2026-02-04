import * as fs from 'node:fs';
import * as path from 'node:path';

import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
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
      // Validate and resolve directory first
      const targetDir = this.directoryValidator.validate(directory);

      // If no config specified and auto-discovery not disabled, check target directory for config file
      const configOptions = { ...options };
      if (!configOptions.config && !options.noAutoConfig) {
        const targetConfig = this.findConfigInDirectory(targetDir);
        if (targetConfig) {
          configOptions.config = targetConfig;
          // Log that we're using an auto-discovered config
          console.log(`ℹ️  ${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${targetConfig}\n`);
        }
      }

      // Load configuration
      const config = this.configService.loadWithOverrides(configOptions);

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
        exitCode: ExitCode.SUCCESS,
        message: COMMAND_MESSAGES.SCAN_SUCCESS.replace('{0}', String(files.length)).replace(
          '{1}',
          targetDir
        )
      };
    } catch (error) {
      return {
        success: false,
        exitCode: ExitCode.ERROR,
        message: `${COMMAND_MESSAGES.SCAN_FAILED}${error instanceof Error ? error.message : String(error)}`
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

  /**
   * Searches for a config file in the target directory.
   * @param directory - Directory to search in
   * @returns Path to config file if found, null otherwise
   */
  private findConfigInDirectory(directory: string): string | null {
    const configNames = ['.orderly.config.json', '.orderly.config.yaml', '.orderly.config.yml'];

    for (const configName of configNames) {
      const configPath = path.join(directory, configName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return null;
  }
}
