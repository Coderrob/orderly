import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { CLI_CONSTANTS } from '../constants';

const FORMAT_CSV = 'csv';
const FORMAT_JSON = 'json';
const FORMAT_TABLE = 'table';
const JSON_INDENT_SPACES = 2;

export interface IScanWorkflowContext {
  readonly scanner: FileScanner;
  readonly targetDir: string;
}

/**
 * Runs the scan workflow after CLI input resolution.
 */
export class ScanWorkflow {
  /**
   * Executes the scan workflow.
   * @param commandContext - Scan execution context.
   * @param format - Requested output format.
   * @returns Scanned files.
   */
  async run(
    commandContext: Readonly<IScanWorkflowContext>,
    format?: string
  ): Promise<readonly IScannedFile[]> {
    const files = await commandContext.scanner.scan(commandContext.targetDir);
    this.displayResults(files, commandContext.scanner, format);
    return files;
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
    console.log(this.formatResults(files, scanner, format));
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
 * Escapes one CSV field when it contains special characters.
 * @param value - Raw field value.
 * @returns CSV-safe field value.
 */
function escapeCsvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Creates a CSV row for one scanned file.
 * @param file - Scanned file.
 * @returns CSV row.
 */
function toCsvRow(file: Readonly<IScannedFile>): string {
  return [
    escapeCsvField(file.filename),
    escapeCsvField(file.extension),
    escapeCsvField(file.category ?? 'uncategorized'),
    escapeCsvField(String(file.size))
  ].join(',');
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
