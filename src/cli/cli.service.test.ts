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
    mockLoggerConstructor.mockImplementationOnce(() => mockLoggerInstance as any);

    // Mock constructor implementations
    (mockFileScanner as any).mockImplementationOnce(() => mockScannerInstance);
    (mockFileOrganizer as any).mockImplementationOnce(() => mockOrganizerInstance);
    (mockManifestGenerator as any).mockImplementationOnce(() => mockManifestGeneratorInstance);

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

    it('should setup organize command with error handling', async () => {
      // Get the action callback that was passed to the organize command
      const organizeActionCall = mockCommand.action.mock.calls.find(
        call => call[0] && typeof call[0] === 'function'
      );
      expect(organizeActionCall).toBeDefined();

      const organizeCallback = organizeActionCall![0] as Function;

      // Mock handleOrganizeCommand to throw an error
      const handleOrganizeCommandSpy = jest.spyOn(cliService as any, 'handleOrganizeCommand');
      handleOrganizeCommandSpy.mockRejectedValue(new Error('Test error'));

      // Mock handleError
      const handleErrorSpy = jest.spyOn(cliService as any, 'handleError');
      handleErrorSpy.mockImplementation(() => {});

      // Call the action callback
      await organizeCallback('.', {});

      // Verify error handling
      expect(handleOrganizeCommandSpy).toHaveBeenCalledWith('.', {});
      expect(handleErrorSpy).toHaveBeenCalledWith(new Error('Test error'));
    });

    it('should setup init command with error handling', () => {
      // Get the action callback that was passed to the init command
      const initActionCall = mockCommand.action.mock.calls.find(
        (call, index) => index > 0 && call[0] && typeof call[0] === 'function'
      );
      expect(initActionCall).toBeDefined();

      const initCallback = initActionCall![0] as Function;

      // Mock handleInitCommand to throw an error
      const handleInitCommandSpy = jest.spyOn(cliService as any, 'handleInitCommand');
      handleInitCommandSpy.mockImplementation(() => {
        throw new Error('Init test error');
      });

      // Mock handleError
      const handleErrorSpy = jest.spyOn(cliService as any, 'handleError');
      handleErrorSpy.mockImplementation(() => {});

      // Call the action callback
      initCallback({ format: 'json' });

      // Verify error handling
      expect(handleInitCommandSpy).toHaveBeenCalledWith({ format: 'json' });
      expect(handleErrorSpy).toHaveBeenCalledWith(new Error('Init test error'));
    });

    it('should setup scan command with error handling', async () => {
      // Get the action callback that was passed to the scan command
      const scanActionCall = mockCommand.action.mock.calls.find(
        (call, index) => index > 1 && call[0] && typeof call[0] === 'function'
      );
      expect(scanActionCall).toBeDefined();

      const scanCallback = scanActionCall![0] as Function;

      // Mock handleScanCommand to throw an error
      const handleScanCommandSpy = jest.spyOn(cliService as any, 'handleScanCommand');
      handleScanCommandSpy.mockRejectedValue(new Error('Scan test error'));

      // Mock handleError
      const handleErrorSpy = jest.spyOn(cliService as any, 'handleError');
      handleErrorSpy.mockImplementation(() => {});

      // Call the action callback
      await scanCallback('.', {});

      // Verify error handling
      expect(handleScanCommandSpy).toHaveBeenCalledWith('.', {});
      expect(handleErrorSpy).toHaveBeenCalledWith(new Error('Scan test error'));
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
      // Mock FileSystemUtils.existsSync to return false (file doesn't exist)
      mockFileSystemUtils.existsSync.mockReturnValueOnce(false);

      // Mock ConfigLoader.save
      mockConfigLoader.save.mockImplementationOnce(() => {});

      // Call the private method directly
      (cliService as any).handleInitCommand({ format: 'json' });

      expect(mockConfigLoader.save).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    });

    it('should handle init command with default format', () => {
      // Mock FileSystemUtils.existsSync to return false (file doesn't exist)
      mockFileSystemUtils.existsSync.mockReturnValueOnce(false);

      // Mock ConfigLoader.save
      mockConfigLoader.save.mockImplementationOnce(() => {});

      // Call the private method directly with no format (should use default)
      (cliService as any).handleInitCommand({});

      expect(mockConfigLoader.save).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    });

    it('should handle init command when config already exists', () => {
      // Mock FileSystemUtils.existsSync to return true (file exists)
      mockFileSystemUtils.existsSync.mockReturnValueOnce(true);

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

      mockConfigLoader.load.mockReturnValueOnce({ ...mockConfig });
      mockScannerInstance.scan.mockResolvedValueOnce(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValueOnce(new Map([['document', 1]]));

      // Mock validateDirectory
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValueOnce('/test/dir');

      // Mock displayScanResults
      const displayScanResultsSpy = jest.spyOn(cliService as any, 'displayScanResults');
      displayScanResultsSpy.mockImplementationOnce(() => {});

      // Call the private method directly
      await (cliService as any).handleScanCommand('.', {});

      expect(mockConfigLoader.load).toHaveBeenCalled();
      expect(mockLoggerConstructor).toHaveBeenCalledWith('info');
      expect(mockFileScanner).toHaveBeenCalledWith(expect.any(Object), mockLoggerInstance);
      expect(mockScannerInstance.scan).toHaveBeenCalledWith('/test/dir');
      expect(displayScanResultsSpy).toHaveBeenCalled();
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
      const logFileSummarySpy = jest.spyOn(cliService as any, 'logFileSummary');
      logFileSummarySpy.mockImplementationOnce(() => {});
      const logResultsSpy = jest.spyOn(cliService as any, 'logResults');
      logResultsSpy.mockImplementationOnce(() => {});
      const saveManifestsSpy = jest.spyOn(cliService as any, 'saveManifests');
      saveManifestsSpy.mockImplementationOnce(() => {});

      mockScannerInstance.scan.mockResolvedValue(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValue(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValue(mockOperations);
      mockOrganizerInstance.executeOperations.mockReturnValue(mockResult);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(loadConfigSpy).toHaveBeenCalledWith({});
      expect(createLoggerSpy).toHaveBeenCalledWith('info');
      expect(validateDirectorySpy).toHaveBeenCalledWith('.', mockLoggerInstance);
      expect(logConfigurationSpy).toHaveBeenCalledWith('/test/dir', false, mockLoggerInstance);
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
      const logFileSummarySpy = jest.spyOn(cliService as any, 'logFileSummary');
      logFileSummarySpy.mockImplementation(() => {});
      const logResultsSpy = jest.spyOn(cliService as any, 'logResults');
      logResultsSpy.mockImplementation(() => {});
      const saveManifestsSpy = jest.spyOn(cliService as any, 'saveManifests');
      saveManifestsSpy.mockImplementationOnce(() => {});

      mockScannerInstance.scan.mockResolvedValueOnce(mockFiles);
      mockScannerInstance.getCategorySummary.mockReturnValueOnce(new Map([['document', 1]]));
      mockOrganizerInstance.planOperations.mockReturnValueOnce(mockOperations);
      mockOrganizerInstance.executeOperations.mockReturnValueOnce(mockResult);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(loadConfigSpy).toHaveBeenCalledWith({});
      expect(createLoggerSpy).toHaveBeenCalledWith('info');
      expect(validateDirectorySpy).toHaveBeenCalledWith('.', mockLoggerInstance);
      expect(logConfigurationSpy).toHaveBeenCalledWith('/test/dir', false, mockLoggerInstance);
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
      const logFileSummarySpy = jest.spyOn(cliService as any, 'logFileSummary');
      logFileSummarySpy.mockImplementation(() => {});

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
        mockFileSystemUtils.existsSync.mockReturnValue(true);

        const mockLogger = { error: jest.fn() };
        const result = (cliService as any).validateDirectory('./test', mockLogger);

        expect(FileSystemUtils.existsSync).toHaveBeenCalledWith(path.resolve('./test'));
        expect(result).toBe(path.resolve('./test'));
        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
      });

      it('should exit when directory does not exist', () => {
        mockFileSystemUtils.existsSync.mockReturnValue(false);

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

        (cliService as any).logConfiguration('/test/dir', true, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith('Target directory: /test/dir');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Running in DRY RUN mode - no files will be modified'
        );
      });

      it('should not log dry run warning when not in dry run mode', () => {
        const mockLogger = { info: jest.fn(), warn: jest.fn() };

        (cliService as any).logConfiguration('/test/dir', false, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith('Target directory: /test/dir');
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe('logFileSummary', () => {
      it('should log file category summary', () => {
        const mockScanner = {
          getCategorySummary: jest.fn().mockReturnValue(
            new Map([
              ['documents', 5],
              ['images', 3]
            ])
          )
        };
        const mockLogger = { info: jest.fn() };

        (cliService as any).logFileSummary(mockScanner, [], mockLogger);

        expect(mockScanner.getCategorySummary).toHaveBeenCalledWith([]);
        expect(mockLogger.info).toHaveBeenCalledWith('\nFile categories found:');
        expect(mockLogger.info).toHaveBeenCalledWith('  documents: 5 files');
        expect(mockLogger.info).toHaveBeenCalledWith('  images: 3 files');
      });
    });

    describe('logResults', () => {
      it('should log successful results', () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() };
        const result = { successful: 10, failed: 0, errors: [] };

        (cliService as any).logResults(result, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(`\n${'='.repeat(50)}`);
        expect(mockLogger.info).toHaveBeenCalledWith(
          chalk.green.bold('✓ Completed: 10 operations')
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it('should log results with failures', () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() };
        const result = { successful: 8, failed: 2, errors: [] };

        (cliService as any).logResults(result, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(`\n${'='.repeat(50)}`);
        expect(mockLogger.info).toHaveBeenCalledWith(chalk.green.bold('✓ Completed: 8 operations'));
        expect(mockLogger.error).toHaveBeenCalledWith(chalk.red.bold('✗ Failed: 2 operations'));
      });
    });

    describe('saveManifests', () => {
      it('should save manifest files', () => {
        (path.join as jest.Mock)
          .mockReturnValueOnce(String.raw`C:\test\dir\.orderly`) // manifestDir
          .mockReturnValueOnce(String.raw`C:\test\dir\.orderly\manifest.json`) // json path
          .mockReturnValueOnce(String.raw`C:\test\dir\.orderly\manifest.md`); // md path

        mockManifestGeneratorInstance.generate.mockReturnValue({});

        const mockLogger = { info: jest.fn() };
        const result = { successful: 5, failed: 0, errors: [] };

        (cliService as any).saveManifests(result, mockLogger);

        expect(path.join).toHaveBeenCalledWith(process.cwd(), '.orderly');
        expect(path.join).toHaveBeenCalledWith(String.raw`C:\test\dir\.orderly`, 'manifest.json');
        expect(path.join).toHaveBeenCalledWith(String.raw`C:\test\dir\.orderly`, 'manifest.md');
        expect(ManifestGenerator).toHaveBeenCalledWith(mockLogger);
        expect(mockManifestGeneratorInstance.generate).toHaveBeenCalledWith(result, []);
        expect(mockManifestGeneratorInstance.save).toHaveBeenCalledWith(
          {},
          String.raw`C:\test\dir\.orderly\manifest.json`
        );
        expect(mockManifestGeneratorInstance.saveMarkdown).toHaveBeenCalledWith(
          {},
          String.raw`C:\test\dir\.orderly\manifest.md`
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Manifest files created in:')
        );
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

    describe('getFilename', () => {
      it('should return json filename for json format', () => {
        const result = (cliService as any).getFilename('json');
        expect(result).toBe('.orderly.config.json');
      });

      it('should return yaml filename for yaml format', () => {
        const result = (cliService as any).getFilename('yaml');
        expect(result).toBe('.orderly.config.yaml');
      });
    });

    describe('displayScanResults', () => {
      it('should display scan results', () => {
        const mockScanner = {
          getCategorySummary: jest.fn().mockReturnValue(new Map([['documents', 3]]))
        };
        mockOrganizerInstance.planOperations.mockReturnValue([
          { type: 'move' },
          { type: 'rename' },
          { type: 'move-rename' }
        ]);

        const mockLogger = {};
        const config = {};
        const files: IScannedFile[] = [];
        const targetDir = '/test';

        (cliService as any).displayScanResults(mockScanner, files, config, mockLogger, targetDir);

        expect(mockScanner.getCategorySummary).toHaveBeenCalledWith(files);
        expect(FileOrganizer).toHaveBeenCalledWith(config, mockLogger, targetDir);
        expect(mockOrganizerInstance.planOperations).toHaveBeenCalledWith(files);
      });
    });

    describe('handleError', () => {
      it('should handle Error instance', () => {
        const error = new Error('Test error');
        (cliService as any).handleError(error);
        expect(process.exit).toHaveBeenCalledWith(1);
      });

      it('should handle non-Error instance', () => {
        const error = 'String error';
        (cliService as any).handleError(error);
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });
  });
});
