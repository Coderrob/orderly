import type { ILogEntry, LogLevel } from '../types';

/**
 * Interface for checking if a log level should be logged.
 * Enables custom log level filtering strategies.
 */
export interface ILogLevelChecker {
  /**
   * Determines if a message at the given level should be logged.
   * @param level - The level of the message to log
   * @param configuredLevel - The minimum level configured for logging
   * @returns true if the message should be logged
   */
  shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean;
}

/**
 * Interface for formatting log messages.
 * Enables custom log output formatting.
 */
export interface ILogFormatter {
  /**
   * Formats a log message with level and timestamp.
   * @param level - The log level
   * @param message - The message to format
   * @returns The formatted log string
   */
  format(level: LogLevel, message: string): string;
}

/**
 * Core logging interface for the application.
 * Provides structured logging with multiple severity levels.
 */
export interface ILogger {
  /**
   * Logs a debug message.
   * @param message - The message to log
   * @param details - Optional additional details
   */
  debug(message: string, details?: unknown): void;

  /**
   * Logs an info message.
   * @param message - The message to log
   * @param details - Optional additional details
   */
  info(message: string, details?: unknown): void;

  /**
   * Logs a warning message.
   * @param message - The message to log
   * @param details - Optional additional details
   */
  warn(message: string, details?: unknown): void;

  /**
   * Logs an error message.
   * @param message - The message to log
   * @param details - Optional additional details
   */
  error(message: string, details?: unknown): void;

  /**
   * Retrieves all logged entries.
   * @returns Array of log entries
   */
  getLogs(): ILogEntry[];

  /**
   * Clears all stored log entries.
   */
  clearLogs(): void;
}
