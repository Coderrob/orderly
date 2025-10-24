import { Logger, LogLevel } from './logger';
import { FileSystemUtils } from '../utils/file-system-utils';
import * as path from 'node:path';

jest.mock('../utils/file-system-utils');
jest.mock('path');
jest.mock('chalk', () => ({
  gray: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text)
}));

describe('Logger', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
  const mockPath = path as jest.Mocked<typeof path>;

  let logger: Logger;
  let testLogLevel: LogLevel;
  let testLogFile: string;
  let testMessage: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    testLogLevel = 'info';
    testLogFile = '/logs/test.log';
    testMessage = 'Test message';
    logger = new Logger(testLogLevel, testLogFile);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockPath.dirname.mockReturnValue('/logs');
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create logger with default log level when not specified', () => {
      const defaultLogger = new Logger();

      defaultLogger.info('test');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should create log directory when log file is specified', () => {
      expect(mockFileSystemUtils.mkdir).toHaveBeenCalledWith('/logs');
    });
  });

  describe('debug', () => {
    it('should log debug message when log level is debug', () => {
      const debugLogger = new Logger('debug', testLogFile);

      debugLogger.debug(testMessage);

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockFileSystemUtils.appendFile).toHaveBeenCalled();
    });

    it('should not log debug message when log level is info', () => {
      logger.debug(testMessage);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log debug message with details', () => {
      const debugLogger = new Logger('debug');
      const details = { key: 'value' };

      debugLogger.debug(testMessage, details);

      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('info', () => {
    it.each([['debug'], ['info']])('should log info message when log level is %s', level => {
      const testLogger = new Logger(level as LogLevel);

      testLogger.info(testMessage);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log info message when log level is warn', () => {
      const warnLogger = new Logger('warn');

      warnLogger.info(testMessage);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should write to log file when log file is configured', () => {
      logger.info(testMessage);

      expect(mockFileSystemUtils.appendFile).toHaveBeenCalledWith(
        testLogFile,
        expect.stringContaining(testMessage)
      );
    });
  });

  describe('warn', () => {
    it.each([['debug'], ['info'], ['warn']])(
      'should log warn message when log level is %s',
      level => {
        const testLogger = new Logger(level as LogLevel);

        testLogger.warn(testMessage);

        expect(consoleSpy).toHaveBeenCalled();
      }
    );

    it('should not log warn message when log level is error', () => {
      const errorLogger = new Logger('error');

      errorLogger.warn(testMessage);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it.each([['debug'], ['info'], ['warn'], ['error']])(
      'should log error message when log level is %s',
      level => {
        const testLogger = new Logger(level as LogLevel);

        testLogger.error(testMessage);

        expect(consoleSpy).toHaveBeenCalled();
      }
    );

    it('should log error with details', () => {
      const details = { error: 'stack trace' };

      logger.error(testMessage, details);

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(mockFileSystemUtils.appendFile).toHaveBeenCalledWith(
        testLogFile,
        expect.stringContaining(JSON.stringify(details))
      );
    });
  });

  describe('getLogs', () => {
    it('should return all logged entries', () => {
      logger.info('message 1');
      logger.warn('message 2');
      logger.error('message 3');

      const logs = logger.getLogs();

      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('message 1');
      expect(logs[1].message).toBe('message 2');
      expect(logs[2].message).toBe('message 3');
    });

    it('should return copy of logs array', () => {
      logger.info(testMessage);
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();

      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logged entries', () => {
      logger.info('message 1');
      logger.info('message 2');

      logger.clearLogs();

      expect(logger.getLogs()).toHaveLength(0);
    });
  });
});
