import * as path from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import { ConfigLoader } from '../config/config-loader';
import { FileOrganizer } from '../organizer/file-organizer';
import { FileScanner } from '../scanner/file-scanner';
import { FileSystemUtils } from '../utils/file-system-utils';
import type { IScannedFile } from '../scanner/interfaces';
import { Logger } from '../logger/logger';
import { ManifestGenerator } from '../organizer/manifest-generator';
import { CliService } from './cli.service';
import { LogLevel } from '../types';
import { OrderlyConfig, NamingConventionType } from '../config/types';
import * as cliHelpers from './cli.service.helpers';

// Mock configuration for tests
const mockConfig: OrderlyConfig = {
  categories: [
    { name: 'images', extensions: ['.jpg', '.png'], targetFolder: 'images' },
    { name: 'documents', extensions: ['.pdf', '.doc'], targetFolder: 'documents' }
  ],
  namingConvention: {
    type: NamingConventionType.KEBAB_CASE,
    lowercase: true
  },
  excludePatterns: ['node_modules/**'],
  includeHidden: false,
  dryRun: false,
  generateManifest: false,
  logLevel: LogLevel.INFO
};

jest.mock('commander');
jest.mock('node:path');
jest.mock('../config/config-loader');
jest.mock('../utils/file-system-utils');
jest.mock('../scanner/file-scanner');
jest.mock('../organizer/file-organizer');
jest.mock('../organizer/manifest-generator');
jest.mock('../logger/logger');

// Get mocked versions
const mockConfigLoader = jest.mocked(ConfigLoader);
const mockFileSystemUtils = jest.mocked(FileSystemUtils);
const mockLoggerConstructor = jest.mocked(Logger);
const mockFileScanner = jest.mocked(FileScanner);
const mockFileOrganizer = jest.mocked(FileOrganizer);
const mockManifestGenerator = jest.mocked(ManifestGenerator);

// Create mock logger instance
const mockLoggerInstance = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Create mock instances
const mockScannerInstance = {
  scan: jest.fn(),
  getCategorySummary: jest.fn()
};

const mockOrganizerInstance = {
  planOperations: jest.fn(),
  executeOperations: jest.fn()
};

const mockManifestGeneratorInstance = {
  generate: jest.fn(),
  save: jest.fn(),
  saveMarkdown: jest.fn()
};

describe('CliService', () => {
  let cliService: CliService;
  let mockCommand: jest.Mocked<Command>;
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let originalCwd: typeof process.cwd;
  let originalLog: typeof console.log;
  let originalError: typeof console.error;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Commander
    mockCommand = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      argument: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis(),
      parse: jest.fn()
    } as any;

    (Command as jest.MockedClass<typeof Command>).mockImplementationOnce(() => mockCommand);

    // Mock Logger constructor
    mockLoggerConstructor.mockImplementation(() => mockLoggerInstance as any);

    // Mock constructor implementations
    (mockFileScanner as any).mockImplementation(() => mockScannerInstance);
    (mockFileOrganizer as any).mockImplementation(() => mockOrganizerInstance);
    (mockManifestGenerator as any).mockImplementation(() => mockManifestGeneratorInstance);

    // Mock process methods
    originalArgv = process.argv;
    originalExit = process.exit;
    originalCwd = process.cwd;
    originalLog = console.log;
    originalError = console.error;

    process.exit = jest.fn() as any;
    process.cwd = jest.fn(() => String.raw`C:\test\dir`);
    console.log = jest.fn();
    console.error = jest.fn();

    cliService = new CliService();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.cwd = originalCwd;
    console.log = originalLog;
    console.error = originalError;
  });

  describe('constructor', () => {
    it('should create a new Command instance', () => {
      expect(Command).toHaveBeenCalledTimes(1);
    });

    it('should setup the program with name, description and version', () => {
      expect(mockCommand.name).toHaveBeenCalledWith('orderly');
      expect(mockCommand.description).toHaveBeenCalledWith(
        'A configurable CLI tool for organizing files with naming conventions and full auditability'
      );
      expect(mockCommand.version).toHaveBeenCalledWith('1.0.0');
    });

    it('should setup all commands', () => {
      expect(mockCommand.command).toHaveBeenCalledWith('organize');
      expect(mockCommand.command).toHaveBeenCalledWith('init');
      expect(mockCommand.command).toHaveBeenCalledWith('scan');
    });

    it('should register an organize action callback', () => {
      // Get the action callback that was passed to the organize command
      const organizeActionCall = mockCommand.action.mock.calls.find(
        call => call[0] && typeof call[0] === 'function'
      );
      expect(organizeActionCall).toBeDefined();
    });

    it('should register an init action callback', () => {
      // Get the action callback that was passed to the init command
      const initActionCall = mockCommand.action.mock.calls.find(
        (call, index) => index > 0 && call[0] && typeof call[0] === 'function'
      );
      expect(initActionCall).toBeDefined();
    });

    it('should register a scan action callback', () => {
      // Get the action callback that was passed to the scan command
      const scanActionCall = mockCommand.action.mock.calls.find(
        (call, index) => index > 1 && call[0] && typeof call[0] === 'function'
      );
      expect(scanActionCall).toBeDefined();
    });
  });

  describe('parse', () => {
    it('should call program.parse()', () => {
      cliService.parse();
      expect(mockCommand.parse).toHaveBeenCalledTimes(1);
    });
  });

  describe('command execution', () => {
    beforeEach(() => {
      // Reset mocks
      (console.log as jest.Mock).mockClear();
      (console.error as jest.Mock).mockClear();
      (process.exit as jest.MockedFunction<typeof process.exit>).mockClear();
    });

    it('should handle init command successfully', () => {
      // Mock FileSystemUtils.hasPath to return false (file doesn't exist)
      mockFileSystemUtils.hasPath.mockReturnValueOnce(false);

      // Mock ConfigLoader.save
      mockConfigLoader.save.mockImplementationOnce(() => {});

      // Call the private method directly
      (cliService as any).handleInitCommand({ format: 'json' });

      expect(mockConfigLoader.save).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    });

    it('should handle init command with default format', () => {
      // Mock FileSystemUtils.hasPath to return false (file doesn't exist)
      mockFileSystemUtils.hasPath.mockReturnValueOnce(false);

      // Mock ConfigLoader.save
      mockConfigLoader.save.mockImplementationOnce(() => {});

      // Call the private method directly with no format (should use default)
      (cliService as any).handleInitCommand({});

      expect(mockConfigLoader.save).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    });

    it('should handle init command when config already exists', () => {
      // Mock FileSystemUtils.hasPath to return true (file exists)
      mockFileSystemUtils.hasPath.mockReturnValueOnce(true);

      // Call the private method directly
      (cliService as any).handleInitCommand({ format: 'json' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Config file already exists')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle scan command successfully', async () => {
      // Mock dependencies
      const mockFiles = [{ path: 'file1.txt' }];
      const mockOperations = [{ type: 'move', source: 'file1.txt', target: 'organized/file1.txt' }];

      mockConfigLoader.load.mockReturnValueOnce({ ...mockConfig });
      mockScannerInstance.scan.mockResolvedValueOnce(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValueOnce(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValueOnce(mockOperations);

      // Mock validateDirectory
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');

      // Call the private method directly
      await (cliService as any).handleScanCommand('.', {});

      expect(mockConfigLoader.load).toHaveBeenCalled();
      expect(mockLoggerConstructor).toHaveBeenCalledWith('info', undefined);
      expect(mockFileScanner).toHaveBeenCalledWith(expect.any(Object), mockLoggerInstance);
      expect(mockScannerInstance.scan).toHaveBeenCalledWith('/test/dir');
      expect(mockOrganizerInstance.planOperations).toHaveBeenCalledWith(mockFiles);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Scan complete'));
    });

    it('should handle scan command with no files found', async () => {
      // Mock dependencies

      mockConfigLoader.load.mockReturnValueOnce({ ...mockConfig });
      mockScannerInstance.scan.mockResolvedValueOnce([]);

      // Mock validateDirectory
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');

      // Call the private method directly
      await (cliService as any).handleScanCommand('.', {});

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('No files found');
      // Should not call displayScanResults or log "Scan complete" when no files found
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Scan complete'));
    });

    it('should ignore scan auto-discovery when no discovery method is present', async () => {
      mockConfigLoader.load.mockReturnValueOnce({ ...mockConfig });
      mockScannerInstance.scan.mockResolvedValueOnce([]);

      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');

      await (cliService as any).handleScanCommand('/test/dir', { autoConfig: true });

      expect(mockConfigLoader.load).toHaveBeenCalledWith(undefined);
    });

    it('should skip scan auto-discovery when autoConfig is false', async () => {
      mockConfigLoader.load.mockReturnValueOnce({ ...mockConfig });
      mockScannerInstance.scan.mockResolvedValueOnce([]);

      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');

      await (cliService as any).handleScanCommand('/test/dir', { autoConfig: false });

      expect(mockConfigLoader.load).toHaveBeenCalledWith(undefined);
    });

    it('should handle organize command successfully', async () => {
      // Mock dependencies
      const mockFiles = [{ path: 'file1.txt' }];
      const mockOperations = [{ type: 'move', source: 'file1.txt', target: 'organized/file1.txt' }];
      const mockResult = { successful: 1, failed: 0, operations: mockOperations };

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValueOnce({ ...mockConfig });
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValueOnce(mockLoggerInstance);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementationOnce(() => {});
      const logFileSummarySpy = jest.spyOn(cliHelpers, 'logFileSummary');
      const logResultsSpy = jest.spyOn(cliHelpers, 'logResults');
      const saveManifestsSpy = jest.spyOn(cliHelpers, 'saveManifests');

      mockScannerInstance.scan.mockResolvedValue(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValue(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValue(mockOperations);
      mockOrganizerInstance.executeOperations.mockReturnValue(mockResult);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(loadConfigSpy).toHaveBeenCalledWith({});
      expect(createLoggerSpy).toHaveBeenCalledWith('info');
      expect(validateDirectorySpy).toHaveBeenCalledWith('.', mockLoggerInstance);
      expect(logConfigurationSpy).toHaveBeenCalledWith(
        '/test/dir',
        expect.objectContaining({ dryRun: false }),
        mockLoggerInstance
      );
      expect(mockScannerInstance.scan).toHaveBeenCalledWith('/test/dir');
      expect(logFileSummarySpy).toHaveBeenCalled();
      expect(mockOrganizerInstance.planOperations).toHaveBeenCalledWith(mockFiles);
      expect(mockOrganizerInstance.executeOperations).toHaveBeenCalledWith(mockOperations);
      expect(logResultsSpy).toHaveBeenCalledWith(mockResult, mockLoggerInstance);
      expect(saveManifestsSpy).not.toHaveBeenCalled(); // generateManifest is false
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Organization complete'));
    });

    it('should handle organize command with failed operations', async () => {
      // Mock dependencies
      const mockFiles = [{ path: 'file1.txt' }];
      const mockOperations = [{ type: 'move', source: 'file1.txt', target: 'organized/file1.txt' }];
      const mockResult = { successful: 1, failed: 2, operations: mockOperations }; // Has failures

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue({ ...mockConfig });
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLoggerInstance);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementation(() => {});
      const logFileSummarySpy = jest.spyOn(cliHelpers, 'logFileSummary');
      const logResultsSpy = jest.spyOn(cliHelpers, 'logResults');
      const saveManifestsSpy = jest.spyOn(cliHelpers, 'saveManifests');

      mockScannerInstance.scan.mockResolvedValueOnce(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValueOnce(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValueOnce(mockOperations);
      mockOrganizerInstance.executeOperations.mockReturnValueOnce(mockResult);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(loadConfigSpy).toHaveBeenCalledWith({});
      expect(createLoggerSpy).toHaveBeenCalledWith('info');
      expect(validateDirectorySpy).toHaveBeenCalledWith('.', mockLoggerInstance);
      expect(logConfigurationSpy).toHaveBeenCalledWith(
        '/test/dir',
        expect.objectContaining({ dryRun: false }),
        mockLoggerInstance
      );
      expect(mockScannerInstance.scan).toHaveBeenCalledWith('/test/dir');
      expect(logFileSummarySpy).toHaveBeenCalled();
      expect(mockOrganizerInstance.planOperations).toHaveBeenCalledWith(mockFiles);
      expect(mockOrganizerInstance.executeOperations).toHaveBeenCalledWith(mockOperations);
      expect(logResultsSpy).toHaveBeenCalledWith(mockResult, mockLoggerInstance);
      expect(saveManifestsSpy).not.toHaveBeenCalled(); // generateManifest is false
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Organization complete'));
      expect(process.exit).toHaveBeenCalledWith(1); // Failures cause exit
    });

    it('should handle organize command with no files found', async () => {
      // Mock dependencies

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue({ ...mockConfig });
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLoggerInstance);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');

      mockScannerInstance.scan.mockResolvedValue([]);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('No files found to organize');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Organization complete')
      );
    });

    it('should handle organize command with no operations needed', async () => {
      // Mock dependencies
      const mockFiles = [{ path: 'file1.txt' }];

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue({ ...mockConfig });
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLoggerInstance);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementation(() => {});
      const logFileSummarySpy = jest.spyOn(cliHelpers, 'logFileSummary');

      mockScannerInstance.scan.mockResolvedValue(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValue(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValue([]);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('\n✓ All files are already organized!');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Organization complete')
      );
    });

    it('should ignore organize auto-discovery when no discovery method is present', async () => {
      const mockFiles = [{ path: 'file1.txt' }];

      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValueOnce({ ...mockConfig });
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValueOnce(mockLoggerInstance);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementationOnce(() => {});
      const logFileSummarySpy = jest.spyOn(cliHelpers, 'logFileSummary');

      mockScannerInstance.scan.mockResolvedValueOnce(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValueOnce(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValueOnce([]);

      await (cliService as any).handleOrganizeCommand('/test/dir', { autoConfig: true });

      expect(loadConfigSpy).toHaveBeenCalledWith({
        autoConfig: true
      });
      expect(validateDirectorySpy).toHaveBeenCalledWith('/test/dir', mockLoggerInstance);
      expect(logConfigurationSpy).toHaveBeenCalledWith(
        '/test/dir',
        expect.objectContaining({ dryRun: false }),
        mockLoggerInstance
      );
      expect(logFileSummarySpy).toHaveBeenCalled();
    });

    describe('loadConfig', () => {
      it('should load config with default values', () => {
        mockConfigLoader.load.mockReturnValue({ ...mockConfig });

        const result = (cliService as any).loadConfig({});

        expect(mockConfigLoader.load).toHaveBeenCalledWith(undefined);
        expect(result).toEqual(mockConfig);
      });

      it('should override config with options', () => {
        mockConfigLoader.load.mockReturnValue({ ...mockConfig });

        const result = (cliService as any).loadConfig({
          dryRun: true,
          manifest: false,
          logLevel: 'debug',
          output: '/custom/output'
        });

        expect(result.dryRun).toBe(true);
        expect(result.generateManifest).toBe(false);
        expect(result.logLevel).toBe('debug');
        expect(result.targetDirectory).toBe(path.resolve('/custom/output'));
      });
    });

    describe('createLogger', () => {
      it('should create logger with log file', () => {
        (path as any).join.mockReturnValue('/mocked/path/.orderly/orderly.log');

        const result = (cliService as any).createLogger('info');

        expect((path as any).join).toHaveBeenCalledWith(process.cwd(), '.orderly', 'orderly.log');
        expect(mockLoggerConstructor).toHaveBeenCalledWith(
          'info',
          '/mocked/path/.orderly/orderly.log'
        );
        expect(result).toBe(mockLoggerInstance);
      });
    });

    describe('validateDirectory', () => {
      it('should return resolved path when directory exists', () => {
        mockFileSystemUtils.hasPath.mockReturnValue(true);

        const mockLogger = { error: jest.fn() };
        const result = (cliService as any).validateDirectory('./test', mockLogger);

        expect(FileSystemUtils.hasPath).toHaveBeenCalledWith(path.resolve('./test'));
        expect(result).toBe(path.resolve('./test'));
        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
      });

      it('should exit when directory does not exist', () => {
        mockFileSystemUtils.hasPath.mockReturnValue(false);

        const mockLogger = { error: jest.fn() };
        (cliService as any).validateDirectory('./nonexistent', mockLogger);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Directory does not exist')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('logConfiguration', () => {
      it('should log configuration information', () => {
        const mockLogger = { info: jest.fn(), warn: jest.fn() };

        (cliService as any).logConfiguration('/test/dir', { dryRun: true }, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith('Target directory: /test/dir');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Running in DRY RUN mode - no files will be modified'
        );
      });

      it('should not log dry run warning when not in dry run mode', () => {
        const mockLogger = { info: jest.fn(), warn: jest.fn() };

        (cliService as any).logConfiguration('/test/dir', { dryRun: false }, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith('Target directory: /test/dir');
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe('validateFormat', () => {
      it('should return valid format', () => {
        const result = (cliService as any).validateFormat('json');
        expect(result).toBe('json');
      });

      it('should return valid format case insensitive', () => {
        const result = (cliService as any).validateFormat('YAML');
        expect(result).toBe('yaml');
      });

      it('should exit for invalid format', () => {
        (cliService as any).validateFormat('invalid');
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });
  });
});
