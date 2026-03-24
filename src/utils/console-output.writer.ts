import chalk from 'chalk';

import { IOutputWriter, OutputFormat } from '../types';

import { isNullOrUndefined, isObject, isArray, isString, isNumber, isBoolean } from './guards';
import { formatJson } from './json.parser';

/**
 * Console-based implementation of IOutputWriter.
 *
 * Provides colored output, structured formatting, and different message types
 * for CLI applications.
 */
export class ConsoleOutputWriter implements IOutputWriter {
  /**
   * Writes a success message with green coloring.
   * @param message - The success message to display
   */
  success(message: string): void {
    console.log(chalk.green(message));
  }

  /**
   * Writes an informational message.
   * @param message - The info message to display
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Writes a warning message with yellow coloring.
   * @param message - The warning message to display
   */
  warning(message: string): void {
    console.log(chalk.yellow(message));
  }

  /**
   * Writes an error message with red coloring.
   * @param message - The error message to display
   */
  error(message: string): void {
    console.log(chalk.red(message));
  }

  /**
   * Writes a plain message without any formatting.
   * @param message - The message to display
   */
  write(message: string): void {
    console.log(message);
  }

  /**
   * Writes a line break.
   */
  newline(): void {
    console.log();
  }

  /**
   * Writes structured data in the specified format.
   * @param data - The data to format and display
   * @param format - The output format (json, csv, or table)
   */
  writeFormatted(data: unknown, format: Readonly<OutputFormat>): void {
    switch (format) {
      case OutputFormat.JSON:
        console.log(formatJson(data));
        break;
      case OutputFormat.CSV:
        this.writeCsv(data);
        break;
      case OutputFormat.TABLE:
        this.writeTable(data);
        break;
      default:
        console.log(String(data));
    }
  }

  /**
   * Writes a section header with bold formatting.
   * @param title - The section title
   */
  section(title: string): void {
    console.log(chalk.bold(title));
  }

  /**
   * Writes a key-value pair with aligned formatting.
   * @param key - The key/label
   * @param value - The value
   */
  keyValue(key: string, value: string): void {
    console.log(`${key}: ${value}`);
  }

  /**
   * Writes data in CSV format.
   * @param data - The data to format and write as CSV
   */
  private writeCsv(data: unknown): void {
    if (!isArray(data)) {
      console.log(String(data));
      return;
    }

    this.writeCsvArray(data);
  }

  /**
   * Writes an array of objects in CSV format.
   * @param data - Array of objects to write as CSV rows
   */
  private writeCsvArray(data: readonly unknown[]): void {
    if (data.length === 0) return;

    const firstItem = data[0];
    if (!isObject(firstItem) || isNullOrUndefined(firstItem)) {
      this.logCsvScalarRows(data);
      return;
    }

    const headers = Object.keys(firstItem);
    console.log(headers.join(','));
    this.logCsvObjectRows(data, headers);
  }

  /**
   * Logs non-object CSV rows by converting each item to a string.
   * @param data - The scalar CSV rows to print.
   */
  private logCsvScalarRows(data: readonly unknown[]): void {
    for (const item of data) {
      console.log(String(item));
    }
  }

  /**
   * Logs CSV rows for object entries using the provided header list.
   * @param data - The object rows to print.
   * @param headers - The CSV header names to extract from each row.
   */
  private logCsvObjectRows(data: readonly unknown[], headers: readonly string[]): void {
    for (const item of data) {
      if (isObject(item)) {
        console.log(this.getCsvRowValue(item, headers).join(','));
      }
    }
  }

  /**
   * Builds the ordered CSV cell values for a row object.
   * @param item - The CSV row object.
   * @param headers - The ordered header names to extract.
   * @returns The escaped CSV cell values for the row.
   */
  private getCsvRowValue(
    item: Readonly<Record<string, unknown>>,
    headers: readonly string[]
  ): readonly string[] {
    return headers.map(this.getCsvCellValue.bind(this, item));
  }

  /**
   * Converts an object property into a CSV-safe cell value.
   * @param item - The CSV row object.
   * @param header - The object key to extract.
   * @returns The escaped CSV cell value.
   */
  private getCsvCellValue(item: Readonly<Record<string, unknown>>, header: string): string {
    const value = Reflect.get(item, header) ?? null;
    return this.escapeCsvValue(this.stringifyCsvValue(value));
  }

  /**
   * Converts a raw value into a string suitable for CSV output.
   * @param value - The raw value to stringify.
   * @returns The normalized string form for CSV output.
   */
  private stringifyCsvValue(value: unknown): string {
    if (isNullOrUndefined(value)) {
      return '';
    }

    if (isObject(value) || isArray(value)) {
      return JSON.stringify(value);
    }

    if (isString(value) || isNumber(value) || isBoolean(value)) {
      return String(value);
    }

    return '';
  }

  /**
   * Escapes a CSV cell value when it contains commas or quotes.
   * @param value - The raw cell value.
   * @returns The escaped CSV cell value.
   */
  private escapeCsvValue(value: string): string {
    return value.includes(',') ? `"${value.replaceAll('"', '""')}"` : value;
  }

  /**
   * Writes data in table format (simplified).
   * @param data - The data to format and write as table
   */
  private writeTable(data: unknown): void {
    if (isArray(data)) {
      for (const item of data) {
        console.log(`- ${String(item)}`);
      }
    } else {
      console.log(String(data));
    }
  }
}
