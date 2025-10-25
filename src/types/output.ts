/**
 * Enumeration of supported output formats for command results.
 * Used for formatting validation and fix reports.
 */
export enum OutputFormat {
  JSON = 'json',
  CSV = 'csv',
  TABLE = 'table'
}

/**
 * Interface for CLI output handling.
 *
 * Provides a consistent API for writing different types of messages to the console
 * with appropriate formatting, colors, and structure.
 */
export interface IOutputWriter {
  /**
   * Writes a success message with green coloring.
   * @param message - The success message to display
   */
  success(message: string): void;

  /**
   * Writes an informational message.
   * @param message - The info message to display
   */
  info(message: string): void;

  /**
   * Writes a warning message with yellow coloring.
   * @param message - The warning message to display
   */
  warning(message: string): void;

  /**
   * Writes an error message with red coloring.
   * @param message - The error message to display
   */
  error(message: string): void;

  /**
   * Writes a plain message without any formatting.
   * @param message - The message to display
   */
  write(message: string): void;

  /**
   * Writes a line break.
   */
  newline(): void;

  /**
   * Writes structured data in the specified format.
   * @param data - The data to format and display
   * @param format - The output format (json, csv, or table)
   */
  writeFormatted(data: unknown, format: OutputFormat): void;

  /**
   * Writes a section header with bold formatting.
   * @param title - The section title
   */
  section(title: string): void;

  /**
   * Writes a key-value pair with aligned formatting.
   * @param key - The key/label
   * @param value - The value
   */
  keyValue(key: string, value: string): void;
}
