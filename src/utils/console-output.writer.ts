import chalk from 'chalk';
import { IOutputWriter, OutputFormat } from '../types';
import { formatJson } from './json.parser';
import { isNullOrUndefined, isObject, isArray, isString, isNumber, isBoolean } from './guards';

/**
 * Console-based implementation of IOutputWriter.
 *
 * Provides colored output, structured formatting, and different message types
 * for CLI applications.
 */
export class ConsoleOutputWriter implements IOutputWriter {
  /**
   * Writes a success message with green coloring.
   */
  success(message: string): void {
    console.log(chalk.green(message));
  }

  /**
   * Writes an informational message.
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Writes a warning message with yellow coloring.
   */
  warning(message: string): void {
    console.log(chalk.yellow(message));
  }

  /**
   * Writes an error message with red coloring.
   */
  error(message: string): void {
    console.log(chalk.red(message));
  }

  /**
   * Writes a plain message without any formatting.
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
   */
  writeFormatted(data: unknown, format: OutputFormat): void {
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
   */
  section(title: string): void {
    console.log(chalk.bold(title));
  }

  /**
   * Writes a key-value pair with aligned formatting.
   */
  keyValue(key: string, value: string): void {
    console.log(`${key}: ${value}`);
  }

  /**
   * Writes data in CSV format.
   */
  private writeCsv(data: unknown): void {
    if (isArray(data)) {
      this.writeCsvArray(data);
    } else {
      console.log(String(data));
    }
  }

  /**
   * Writes an array of objects in CSV format.
   */
  private writeCsvArray(data: unknown[]): void {
    if (data.length === 0) return;

    // Get headers from first object
    const firstItem = data[0];
    if (!isObject(firstItem) || isNullOrUndefined(firstItem)) {
      for (const item of data) {
        console.log(String(item));
      }
      return;
    }

    const headers = Object.keys(firstItem);
    console.log(headers.join(','));

    // Write data rows
    for (const item of data) {
      if (isObject(item)) {
        const values = headers.map(header => {
          const value = Reflect.get(item, header) ?? null;
          // Convert value to string safely
          let stringValue: string;
          if (isNullOrUndefined(value)) {
            stringValue = '';
          } else if (isObject(value) || isArray(value)) {
            stringValue = JSON.stringify(value);
          } else if (isString(value) || isNumber(value) || isBoolean(value)) {
            stringValue = String(value);
          } else {
            stringValue = '';
          }
          // Escape quotes and wrap in quotes if contains comma
          return stringValue.includes(',') ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
        });
        console.log(values.join(','));
      }
    }
  }

  /**
   * Writes data in table format (simplified).
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
