export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface ILogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}

export type LogEntry = ILogEntry;
