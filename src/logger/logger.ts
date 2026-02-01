import * as path from 'node:path';

import chalk from 'chalk';

import { LogEntry, LogLevel } from '../types';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { ILogLevelChecker, ILogFormatter, ILogger } from './interfaces';

export type { ILogger, ILogLevelChecker, ILogFormatter } from './interfaces';

class LogLevelChecker implements ILogLevelChecker {
  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  /**
   *
   * @param level
   * @param configuredLevel
   */
  shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[configuredLevel];
  }
}

class LogFormatter implements ILogFormatter {
  /**
   *
   * @param level
   * @param message
   */
  format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const coloredPrefix = this.colorizePrefix(prefix, level);
    return `${coloredPrefix} ${message}`;
  }

  /**
   *
   * @param prefix
   * @param level
   */
  private colorizePrefix(prefix: string, level: LogLevel): string {
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
  private logs: LogEntry[] = [];
  private readonly levelChecker = new LogLevelChecker();
  private readonly formatter = new LogFormatter();

  /**
   *
   * @param logLevel
   * @param logFile
   */
  constructor(
    private readonly logLevel: LogLevel = LogLevel.INFO,
    private readonly logFile?: string
  ) {
    if (this.logFile) {
      FileSystemUtils.mkdirSync(path.dirname(this.logFile));
    }
  }

  /**
   *
   * @param level
   * @param message
   * @param details
   */
  private log(level: LogLevel, message: string, details?: unknown): void {
    if (!this.levelChecker.shouldLog(level, this.logLevel)) {
      return;
    }

    const entry = this.createLogEntry(level, message, details);
    this.logs.push(entry);

    this.writeToConsole(level, message, details);
    this.writeToFile(entry);
  }

  /**
   *
   * @param level
   * @param message
   * @param details
   */
  private createLogEntry(level: LogLevel, message: string, details?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
  }

  /**
   *
   * @param level
   * @param message
   * @param details
   */
  private writeToConsole(level: LogLevel, message: string, details?: unknown): void {
    const formattedMessage = this.formatter.format(level, message);
    console.log(formattedMessage);

    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, 2)));
    }
  }

  /**
   *
   * @param entry
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.logFile) return;

    const detailsStr = entry.details ? ` ${JSON.stringify(entry.details)}` : '';
    const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${detailsStr}\n`;
    FileSystemUtils.appendFileSync(this.logFile, logLine);
  }

  /**
   *
   * @param message
   * @param details
   */
  debug(message: string, details?: unknown): void {
    this.log(LogLevel.DEBUG, message, details);
  }

  /**
   *
   * @param message
   * @param details
   */
  info(message: string, details?: unknown): void {
    this.log(LogLevel.INFO, message, details);
  }

  /**
   *
   * @param message
   * @param details
   */
  warn(message: string, details?: unknown): void {
    this.log(LogLevel.WARN, message, details);
  }

  /**
   *
   * @param message
   * @param details
   */
  error(message: string, details?: unknown): void {
    this.log(LogLevel.ERROR, message, details);
  }

  /**
   *
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   *
   */
  clearLogs(): void {
    this.logs = [];
  }
}
