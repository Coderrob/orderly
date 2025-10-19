import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
}

export class Logger {
  private logLevel: LogLevel;
  private logFile?: string;
  private logs: LogEntry[] = [];

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(logLevel: LogLevel = 'info', logFile?: string) {
    this.logLevel = logLevel;
    this.logFile = logFile;

    if (this.logFile) {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    let coloredPrefix: string;
    switch (level) {
      case 'debug':
        coloredPrefix = chalk.gray(prefix);
        break;
      case 'info':
        coloredPrefix = chalk.blue(prefix);
        break;
      case 'warn':
        coloredPrefix = chalk.yellow(prefix);
        break;
      case 'error':
        coloredPrefix = chalk.red(prefix);
        break;
    }

    return `${coloredPrefix} ${message}`;
  }

  private log(level: LogLevel, message: string, details?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };

    this.logs.push(entry);

    const formattedMessage = this.formatMessage(level, message);
    console.log(formattedMessage);

    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, 2)));
    }

    if (this.logFile) {
      const logLine = `${entry.timestamp} [${level.toUpperCase()}] ${message}${details ? ' ' + JSON.stringify(details) : ''}\n`;
      fs.appendFileSync(this.logFile, logLine, 'utf8');
    }
  }

  debug(message: string, details?: any): void {
    this.log('debug', message, details);
  }

  info(message: string, details?: any): void {
    this.log('info', message, details);
  }

  warn(message: string, details?: any): void {
    this.log('warn', message, details);
  }

  error(message: string, details?: any): void {
    this.log('error', message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
