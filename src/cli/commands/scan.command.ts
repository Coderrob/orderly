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
  IConfigService,
  IDirectoryValidator,
  ICommandResult,
  IScanHandler,
  IScanOptions
} from '../interfaces';

const FORMAT_CSV = 'csv';
const FORMAT_JSON = 'json';
const FORMAT_TABLE = 'table';
const JSON_INDENT_SPACES = 2;

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
    this.displayResults(files, commandContext.scanner, options.format);

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
   * @param files - Scanned files.
   * @param scanner - File scanner instance.
   * @param format - Requested output format.
   */
  private displayResults(
    files: readonly IScannedFile[],
    scanner: Readonly<FileScanner>,
    format?: string
  ): void {
    if (format === FORMAT_JSON || format === FORMAT_CSV) {
      console.log(this.formatResults(files, scanner, format));
      return;
    }

    console.log('\nOrderly - File Scan Results\n');
    console.log(`Found ${files.length} files\n`);
    console.log('File categories:');
    for (const [category, count] of scanner.getCategorySummary(files)) {
      console.log(`  ${category}: ${count}`);
    }

    for (const line of this.createSampleLines(files)) {
      console.log(line);
    }
  }

  /**
   * Formats scan results for console output.
   * @param files - Scanned files.
   * @param scanner - File scanner instance.
   * @param format - Requested output format.
   * @returns Formatted output string.
   */
  private formatResults(
    files: readonly IScannedFile[],
    scanner: Readonly<FileScanner>,
    format?: string
  ): string {
    switch (format) {
      case FORMAT_JSON:
        return JSON.stringify(this.toJsonPayload(files, scanner), null, JSON_INDENT_SPACES);
      case FORMAT_CSV:
        return this.toCsv(files);
      case FORMAT_TABLE:
      default:
        return this.toTable(files, scanner);
    }
  }

  /**
   * Builds the JSON payload for scan output.
   * @param files - Scanned files.
   * @param scanner - File scanner instance.
   * @returns Serializable scan payload.
   */
  private toJsonPayload(
    files: readonly IScannedFile[],
    scanner: Readonly<FileScanner>
  ): Readonly<{
    files: readonly IScannedFile[];
    summary: readonly Readonly<{ category: string; count: number }>[];
  }> {
    return {
      files,
      summary: [...scanner.getCategorySummary(files)].map(toSummaryEntry)
    };
  }

  /**
   * Builds CSV output for scan results.
   * @param files - Scanned files.
   * @returns CSV output.
   */
  private toCsv(files: readonly IScannedFile[]): string {
    const rows = files.map(toCsvRow);
    return ['filename,extension,category,size', ...rows].join('\n');
  }

  /**
   * Builds table output for scan results.
   * @param files - Scanned files.
   * @param scanner - File scanner instance.
   * @returns Table output.
   */
  private toTable(files: readonly IScannedFile[], scanner: Readonly<FileScanner>): string {
    const headerLines = [
      '\nOrderly - File Scan Results\n',
      `Found ${files.length} files\n`,
      'File categories:'
    ];
    const summaryLines = [...scanner.getCategorySummary(files)].map(toSummaryLine);
    return [...headerLines, ...summaryLines, ...this.createSampleLines(files)].join('\n');
  }

  /**
   * Builds sample lines for table output.
   * @param files - Scanned files.
   * @returns Sample file lines.
   */
  private createSampleLines(files: readonly IScannedFile[]): readonly string[] {
    if (files.length === 0) {
      return [];
    }

    const fileLines = files.slice(0, CLI_CONSTANTS.MAX_DISPLAY_FILES).map(createSampleLine);
    const remainingLine =
      files.length > CLI_CONSTANTS.MAX_DISPLAY_FILES
        ? [`  ... and ${files.length - CLI_CONSTANTS.MAX_DISPLAY_FILES} more files`]
        : [];
    return ['\nSample files:', ...fileLines, ...remainingLine];
  }
}

/**
 * Creates a sample output line for one scanned file.
 * @param file - Scanned file.
 * @param index - Zero-based sample index.
 * @returns Sample line.
 */
function createSampleLine(file: Readonly<IScannedFile>, index: number): string {
  return `  ${index + 1}. ${file.filename} (${file.category || 'uncategorized'})`;
}

/**
 * Creates a CSV row for one scanned file.
 * @param file - Scanned file.
 * @returns CSV row.
 */
function toCsvRow(file: Readonly<IScannedFile>): string {
  return [file.filename, file.extension, file.category ?? 'uncategorized', String(file.size)].join(
    ','
  );
}

/**
 * Creates a summary payload entry.
 * @param entry - Category/count tuple.
 * @returns Summary entry object.
 */
function toSummaryEntry(
  entry: readonly [string, number]
): Readonly<{ category: string; count: number }> {
  return { category: entry[0], count: entry[1] };
}

/**
 * Creates a formatted summary line.
 * @param entry - Category/count tuple.
 * @returns Summary line.
 */
function toSummaryLine(entry: readonly [string, number]): string {
  return `  ${entry[0]}: ${entry[1]}`;
}
