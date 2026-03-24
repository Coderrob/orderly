import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { CLI_CONSTANTS, ExitCode, COMMAND_MESSAGES } from '../constants';
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
    private readonly configService: Readonly<IConfigService>,
    private readonly directoryValidator: Readonly<IDirectoryValidator>
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
    options: Readonly<IScanOptions>,
    context?: Readonly<IAutoConfigContext<IScanOptions>>
  ): Promise<ICommandResult> {
    const commandContext = this.createCommandContext(directory, options, context);
    const files = await commandContext.scanner.scan(commandContext.targetDir);
    this.displayResults(files, commandContext.scanner);

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.SCAN_SUCCESS.replace('{0}', String(files.length)).replace(
        '{1}',
        commandContext.targetDir
      )
    };
  }

  /**
   * Creates the shared command context used during scan execution.
   * @param directory - Target directory to scan.
   * @param options - Scan command options.
   * @param context - Optional auto-config discovery context.
   * @returns Shared command context.
   */
  private createCommandContext(
    directory: string,
    options: Readonly<IScanOptions>,
    context?: Readonly<IAutoConfigContext<IScanOptions>>
  ): Readonly<{ scanner: FileScanner; targetDir: string }> {
    const targetDir = context?.targetDir ?? this.directoryValidator.validate(directory);
    const config = this.configService.loadWithOverrides(context?.configOptions ?? { ...options });
    const logger = new Logger(config.logLevel);

    this.logAutoDiscoveredConfig(logger, context?.autoDiscoveredConfig);
    return { scanner: new FileScanner(config, logger), targetDir };
  }

  /**
   * Logs the discovered config path when auto-config resolution finds one.
   * @param logger - Logger instance.
   * @param autoDiscoveredConfig - Auto-discovered config path.
   */
  private logAutoDiscoveredConfig(logger: Readonly<Logger>, autoDiscoveredConfig?: string): void {
    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }
  }

  /**
   * Displays scan results to the console.
   * @param files - Scanned files
   * @param scanner - File scanner instance
   */
  private displayResults(files: readonly IScannedFile[], scanner: Readonly<FileScanner>): void {
    console.log('\n🗂️  Orderly - File Scan Results\n');
    console.log(`Found ${files.length} files\n`);
    this.printCategorySummary(scanner, files);
    this.printSampleFiles(files);
  }

  /**
   * Prints the category summary for scanned files.
   * @param scanner - File scanner instance.
   * @param files - Scanned files.
   */
  private printCategorySummary(
    scanner: Readonly<FileScanner>,
    files: readonly IScannedFile[]
  ): void {
    console.log('File categories:');
    for (const [category, count] of scanner.getCategorySummary(files)) {
      console.log(`  ${category}: ${count}`);
    }
  }

  /**
   * Prints a sample of scanned files.
   * @param files - Scanned files.
   */
  private printSampleFiles(files: readonly IScannedFile[]): void {
    if (files.length === 0) return;

    console.log('\nSample files:');
    for (const [index, file] of files.slice(0, CLI_CONSTANTS.MAX_DISPLAY_FILES).entries()) {
      console.log(`  ${index + 1}. ${file.filename} (${file.category || 'uncategorized'})`);
    }

    if (files.length > CLI_CONSTANTS.MAX_DISPLAY_FILES) {
      console.log(`  ... and ${files.length - CLI_CONSTANTS.MAX_DISPLAY_FILES} more files`);
    }
  }
}
