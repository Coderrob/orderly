import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
import {
  IAutoConfigContext,
  WithAutoConfigDiscovery
} from '../decorators/auto-config-discovery.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
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
   * Creates a new ScanHandler instance
   * @param configService - Service for loading and managing configuration
   * @param directoryValidator - Service for validating directory paths
   */
  constructor(
    private readonly configService: IConfigService,
    private readonly directoryValidator: IDirectoryValidator
  ) {}

  /**
   * Executes the scan command.
   * @param directory - Target directory to scan
   * @param options - Scan command options
   * @param context - Optional context injected by auto-config discovery.
   * @returns Promise resolving to command result
   */
  @WithCommandTelemetry('scan')
  @HandleCommandErrors(COMMAND_MESSAGES.SCAN_FAILED)
  @WithAutoConfigDiscovery<IScanOptions>()
  async execute(
    directory: string,
    options: IScanOptions,
    context?: IAutoConfigContext<IScanOptions>
  ): Promise<ICommandResult> {
    const targetDir = context?.targetDir ?? this.directoryValidator.validate(directory);
    const configOptions = context?.configOptions ?? { ...options };
    const autoDiscoveredConfig = context?.autoDiscoveredConfig;

    // Load configuration
    const config = this.configService.loadWithOverrides(configOptions);

    // Create logger
    const logger = new Logger(config.logLevel);

    // Log auto-discovered config through the logger so log-level and log-file output are respected
    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }

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
