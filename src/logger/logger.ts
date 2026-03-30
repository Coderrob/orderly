import * as path from 'node:path';

import chalk from 'chalk';

import { type ILogEntry, LogLevel } from '../types';
import { Clock } from '../utils/clock';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { ILogLevelChecker, ILogFormatter, ILogger } from './interfaces';

export type { ILogger, ILogLevelChecker, ILogFormatter } from './interfaces';

const TIMESTAMP_PRECISION = 3;
const JSON_INDENT_SPACES = 2;
const WARN_LEVEL_PRIORITY = 2;
const ERROR_LEVEL_PRIORITY = 3;
const MAX_STORED_LOG_ENTRIES = 1000;

const logStore = new WeakMap<Logger, readonly Readonly<ILogEntry>[]>();

class LogLevelChecker implements ILogLevelChecker {
  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: WARN_LEVEL_PRIORITY,
    [LogLevel.ERROR]: ERROR_LEVEL_PRIORITY
  };

  /**
   * Determines whether a message should be logged based on configured and message log levels
   * @param level - The log level of the message
   * @param configuredLevel - The minimum log level configured for logging
   * @returns True if the message log level is at or above the configured level, false otherwise
   */
  shouldLog(level: Readonly<LogLevel>, configuredLevel: Readonly<LogLevel>): boolean {
    return this.levelPriority[level] >= this.levelPriority[configuredLevel];
  }
}

class LogFormatter implements ILogFormatter {
  /**
   * Formats a log message with timestamp and colorized log level prefix
   * @param level - The log level indicating message severity
   * @param message - The log message text to format
   * @returns Formatted log message with timestamp and colored level prefix
   */
  format(level: Readonly<LogLevel>, message: string): string {
    const timestamp = `t+${Clock.nowMonotonicMs().toFixed(TIMESTAMP_PRECISION)}ms`;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const coloredPrefix = this.colorizePrefix(prefix, level);
    return `${coloredPrefix} ${message}`;
  }

  /**
   * Applies color formatting to the log prefix based on the message's log level
   * @param prefix - The log prefix text to colorize
   * @param level - The log level that determines the color to apply
   * @returns Colorized prefix text suitable for console output
   */
  private colorizePrefix(prefix: string, level: Readonly<LogLevel>): string {
    const colorMap: Record<LogLevel, (text: string) => string> = {
      [LogLevel.DEBUG]: chalk.gray,
      [LogLevel.INFO]: chalk.blue,
      [LogLevel.WARN]: chalk.yellow,
      [LogLevel.ERROR]: chalk.red
    };
    return colorMap[level](prefix);
  }
}

export class Logger implements ILogger {
  private readonly levelChecker = new LogLevelChecker();
  private readonly formatter = new LogFormatter();

  /**
   * Creates a new Logger instance with specified log level and optional file output
   * @param logLevel - Minimum log level to output (default: INFO). Messages below this level are ignored
   * @param logFile - Optional path to a file where log entries will be appended
   */
  constructor(
    private readonly logLevel: Readonly<LogLevel> = LogLevel.INFO,
    private readonly logFile?: string
  ) {
    logStore.set(this, []);

    if (this.logFile) {
      FileSystemUtils.mkdirSync(path.dirname(this.logFile));
    }
  }

  /**
   * Internal method to handle logging at a specified level with optional details
   * @param level - The log level for this message
   * @param message - The log message text
   * @param details - Optional additional details to log (will be JSON stringified)
   */
  private log(level: Readonly<LogLevel>, message: string, details?: unknown): void {
    if (!this.levelChecker.shouldLog(level, this.logLevel)) {
      return;
    }

    const entry = this.createLogEntry(level, message, details);
    this.storeLog(entry);

    this.writeToConsole(level, message, details);
    this.writeToFile(entry);
  }

  /**
   * Creates a structured log entry with timestamp and message metadata
   * @param level - The log level indicating message severity
   * @param message - The log message text
   * @param details - Optional additional data associated with the log entry
   * @returns A structured log entry object ready for storage or output
   */
  private createLogEntry(
    level: Readonly<LogLevel>,
    message: string,
    details?: unknown
  ): Readonly<ILogEntry> {
    return {
      timestamp: `t+${Clock.nowMonotonicMs().toFixed(TIMESTAMP_PRECISION)}ms`,
      level,
      message,
      details
    };
  }

  /**
   * Writes a log message and optional details to the console output
   * @param level - The log level for coloring and formatting
   * @param message - The log message text
   * @param details - Optional additional details to output in formatted JSON
   */
  private writeToConsole(level: Readonly<LogLevel>, message: string, details?: unknown): void {
    const formattedMessage = this.formatter.format(level, message);
    console.log(formattedMessage);

    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, JSON_INDENT_SPACES)));
    }
  }

  /**
   * Writes a log entry to the configured log file, if one is set
   * @param entry - The log entry to write to file
   */
  private writeToFile(entry: Readonly<ILogEntry>): void {
    if (!this.logFile) return;

    const detailsStr = entry.details ? ` ${JSON.stringify(entry.details)}` : '';
    const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${detailsStr}\n`;
    FileSystemUtils.appendFileSync(this.logFile, logLine);
  }

  /**
   * Logs a debug level message with optional details
   * @param message - The debug message text
   * @param details - Optional additional debugging information
   */
  debug(message: string, details?: unknown): void {
    this.log(LogLevel.DEBUG, message, details);
  }

  /**
   * Logs an informational message with optional details
   * @param message - The informational message text
   * @param details - Optional additional context information
   */
  info(message: string, details?: unknown): void {
    this.log(LogLevel.INFO, message, details);
  }

  /**
   * Logs a warning message with optional details
   * @param message - The warning message text
   * @param details - Optional additional warning details
   */
  warn(message: string, details?: unknown): void {
    this.log(LogLevel.WARN, message, details);
  }

  /**
   * Logs an error message with optional details
   * @param message - The error message text
   * @param details - Optional additional error information or context
   */
  error(message: string, details?: unknown): void {
    this.log(LogLevel.ERROR, message, details);
  }

  /**
   * Retrieves a copy of all logged entries
   * @returns Array containing all logged entries in the order they were recorded
   */
  getLogs(): ILogEntry[] {
    return [...this.getStoredLogs()];
  }

  /**
   * Clears all logged entries from the logger instance
   */
  clearLogs(): void {
    logStore.set(this, []);
  }

  /**
   * Stores a new log entry immutably.
   * @param entry - Entry to append to the in-memory store
   */
  private storeLog(entry: Readonly<ILogEntry>): void {
    const nextLogs = [...this.getStoredLogs(), entry];
    logStore.set(this, nextLogs.slice(-MAX_STORED_LOG_ENTRIES));
  }

  /**
   * Retrieves stored log entries for this logger.
   * @returns Readonly list of log entries
   */
  private getStoredLogs(): readonly Readonly<ILogEntry>[] {
    const existingLogs = logStore.get(this);

    return existingLogs ?? [];
  }
}
