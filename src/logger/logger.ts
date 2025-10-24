import * as path from 'node:path';
import chalk from 'chalk';
import { FileSystemUtils } from '../utils/file-system-utils';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}

class LogLevelChecker {
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[configuredLevel];
  }
}

class LogFormatter {
  format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const coloredPrefix = this.colorizePrefix(prefix, level);
    return `${coloredPrefix} ${message}`;
  }

  private colorizePrefix(prefix: string, level: LogLevel): string {
    const colorMap: Record<LogLevel, (text: string) => string> = {
      debug: chalk.gray,
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red
    };
    return colorMap[level](prefix);
  }
}

export class Logger {
  private logs: LogEntry[] = [];
  private readonly levelChecker = new LogLevelChecker();
  private readonly formatter = new LogFormatter();

  constructor(
    private readonly logLevel: LogLevel = 'info',
    private readonly logFile?: string
  ) {
    if (this.logFile) {
      FileSystemUtils.mkdir(path.dirname(this.logFile));
    }
  }

  private log(level: LogLevel, message: string, details?: unknown): void {
    if (!this.levelChecker.shouldLog(level, this.logLevel)) {
      return;
    }

    const entry = this.createLogEntry(level, message, details);
    this.logs.push(entry);

    this.writeToConsole(level, message, details);
    this.writeToFile(entry);
  }

  private createLogEntry(level: LogLevel, message: string, details?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
  }

  private writeToConsole(level: LogLevel, message: string, details?: unknown): void {
    const formattedMessage = this.formatter.format(level, message);
    console.log(formattedMessage);

    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, 2)));
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.logFile) return;

    const detailsStr = entry.details ? ` ${JSON.stringify(entry.details)}` : '';
    const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${detailsStr}\n`;
    FileSystemUtils.appendFile(this.logFile, logLine);
  }

  debug(message: string, details?: unknown): void {
    this.log('debug', message, details);
  }

  info(message: string, details?: unknown): void {
    this.log('info', message, details);
  }

  warn(message: string, details?: unknown): void {
    this.log('warn', message, details);
  }

  error(message: string, details?: unknown): void {
    this.log('error', message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
