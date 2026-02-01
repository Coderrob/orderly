import * as path from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import type { IScannedFile } from '../scanner/interfaces';
import { CliService } from './cli.service';

jest.mock('commander');
jest.mock('node:path');
jest.mock('../config/config-loader');
jest.mock('../utils/file-system-utils');
jest.mock('../scanner/file-scanner');
jest.mock('../organizer/file-organizer');
jest.mock('../organizer/manifest-generator');
jest.mock('../logger/logger');

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

    (Command as jest.MockedClass<typeof Command>).mockImplementation(() => mockCommand);

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
      const { FileSystemUtils } = require('../utils/file-system-utils');
      FileSystemUtils.existsSync.mockReturnValue(false);

      // Mock ConfigLoader.save
      const { ConfigLoader } = require('../config/config-loader');
      ConfigLoader.save.mockImplementation(() => {});

      // Call the private method directly
      (cliService as any).handleInitCommand({ format: 'json' });

      expect(ConfigLoader.save).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    });

    it('should handle init command with default format', () => {
      // Mock FileSystemUtils.existsSync to return false (file doesn't exist)
      const { FileSystemUtils } = require('../utils/file-system-utils');
      FileSystemUtils.existsSync.mockReturnValue(false);

      // Mock ConfigLoader.save
      const { ConfigLoader } = require('../config/config-loader');
      ConfigLoader.save.mockImplementation(() => {});

      // Call the private method directly with no format (should use default)
      (cliService as any).handleInitCommand({});

      expect(ConfigLoader.save).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    });

    it('should handle init command when config already exists', () => {
      // Mock FileSystemUtils.existsSync to return true (file exists)
      const { FileSystemUtils } = require('../utils/file-system-utils');
      FileSystemUtils.existsSync.mockReturnValue(true);

      // Call the private method directly
      (cliService as any).handleInitCommand({ format: 'json' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Config file already exists')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle scan command successfully', async () => {
      // Mock dependencies
      const { ConfigLoader } = require('../config/config-loader');
      const { Logger } = require('../logger/logger');
      const { FileScanner } = require('../scanner/file-scanner');

      const mockConfig = { dryRun: false, logLevel: 'info' };
      const mockLogger = { info: jest.fn() };
      const mockScanner = { scan: jest.fn(), getCategorySummary: jest.fn() };
      const mockFiles = [{ path: 'file1.txt' }];

      ConfigLoader.load.mockReturnValue(mockConfig);
      Logger.mockImplementation(() => mockLogger);
      FileScanner.mockImplementation(() => mockScanner);
      mockScanner.scan.mockResolvedValue(mockFiles);
      mockScanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));

      // Mock validateDirectory
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');

      // Mock displayScanResults
      const displayScanResultsSpy = jest.spyOn(cliService as any, 'displayScanResults');
      displayScanResultsSpy.mockImplementation(() => {});

      // Call the private method directly
      await (cliService as any).handleScanCommand('.', {});

      expect(ConfigLoader.load).toHaveBeenCalled();
      expect(Logger).toHaveBeenCalledWith('info');
      expect(FileScanner).toHaveBeenCalledWith(mockConfig, mockLogger);
      expect(mockScanner.scan).toHaveBeenCalledWith('/test/dir');
      expect(displayScanResultsSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Scan complete'));
    });

    it('should handle scan command with no files found', async () => {
      // Mock dependencies
      const { ConfigLoader } = require('../config/config-loader');
      const { Logger } = require('../logger/logger');
      const { FileScanner } = require('../scanner/file-scanner');

      const mockConfig = { dryRun: false, logLevel: 'info' };
      const mockLogger = { info: jest.fn() };
      const mockScanner = { scan: jest.fn() };

      ConfigLoader.load.mockReturnValue(mockConfig);
      Logger.mockImplementation(() => mockLogger);
      FileScanner.mockImplementation(() => mockScanner);
      mockScanner.scan.mockResolvedValue([]);

      // Mock validateDirectory
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');

      // Call the private method directly
      await (cliService as any).handleScanCommand('.', {});

      expect(mockLogger.info).toHaveBeenCalledWith('No files found');
      // Should not call displayScanResults or log "Scan complete" when no files found
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Scan complete'));
    });

    it('should handle organize command successfully', async () => {
      // Mock dependencies
      const { FileScanner } = require('../scanner/file-scanner');
      const { FileOrganizer } = require('../organizer/file-organizer');

      const mockConfig = { dryRun: false, logLevel: 'info', generateManifest: false };
      const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const mockScanner = { scan: jest.fn(), getCategorySummary: jest.fn() };
      const mockOrganizer = { planOperations: jest.fn(), executeOperations: jest.fn() };
      const mockFiles = [{ path: 'file1.txt' }];
      const mockOperations = [{ type: 'move', source: 'file1.txt', target: 'organized/file1.txt' }];
      const mockResult = { successful: 1, failed: 0, operations: mockOperations };

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue(mockConfig);
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLogger);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementation(() => {});
      const logFileSummarySpy = jest.spyOn(cliService as any, 'logFileSummary');
      logFileSummarySpy.mockImplementation(() => {});
      const logResultsSpy = jest.spyOn(cliService as any, 'logResults');
      logResultsSpy.mockImplementation(() => {});
      const saveManifestsSpy = jest.spyOn(cliService as any, 'saveManifests');
      saveManifestsSpy.mockImplementation(() => {});

      FileScanner.mockImplementation(() => mockScanner);
      FileOrganizer.mockImplementation(() => mockOrganizer);
      mockScanner.scan.mockResolvedValue(mockFiles);
      mockScanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));
      mockOrganizer.planOperations.mockReturnValue(mockOperations);
      mockOrganizer.executeOperations.mockReturnValue(mockResult);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(loadConfigSpy).toHaveBeenCalledWith({});
      expect(createLoggerSpy).toHaveBeenCalledWith('info');
      expect(validateDirectorySpy).toHaveBeenCalledWith('.', mockLogger);
      expect(logConfigurationSpy).toHaveBeenCalledWith('/test/dir', false, mockLogger);
      expect(mockScanner.scan).toHaveBeenCalledWith('/test/dir');
      expect(logFileSummarySpy).toHaveBeenCalled();
      expect(mockOrganizer.planOperations).toHaveBeenCalledWith(mockFiles);
      expect(mockOrganizer.executeOperations).toHaveBeenCalledWith(mockOperations);
      expect(logResultsSpy).toHaveBeenCalledWith(mockResult, mockLogger);
      expect(saveManifestsSpy).not.toHaveBeenCalled(); // generateManifest is false
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Organization complete'));
    });

    it('should handle organize command with failed operations', async () => {
      // Mock dependencies
      const { FileScanner } = require('../scanner/file-scanner');
      const { FileOrganizer } = require('../organizer/file-organizer');

      const mockConfig = { dryRun: false, logLevel: 'info', generateManifest: false };
      const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const mockScanner = { scan: jest.fn(), getCategorySummary: jest.fn() };
      const mockOrganizer = { planOperations: jest.fn(), executeOperations: jest.fn() };
      const mockFiles = [{ path: 'file1.txt' }];
      const mockOperations = [{ type: 'move', source: 'file1.txt', target: 'organized/file1.txt' }];
      const mockResult = { successful: 1, failed: 2, operations: mockOperations }; // Has failures

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue(mockConfig);
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLogger);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementation(() => {});
      const logFileSummarySpy = jest.spyOn(cliService as any, 'logFileSummary');
      logFileSummarySpy.mockImplementation(() => {});
      const logResultsSpy = jest.spyOn(cliService as any, 'logResults');
      logResultsSpy.mockImplementation(() => {});
      const saveManifestsSpy = jest.spyOn(cliService as any, 'saveManifests');
      saveManifestsSpy.mockImplementation(() => {});

      FileScanner.mockImplementation(() => mockScanner);
      FileOrganizer.mockImplementation(() => mockOrganizer);
      mockScanner.scan.mockResolvedValue(mockFiles);
      mockScanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));
      mockOrganizer.planOperations.mockReturnValue(mockOperations);
      mockOrganizer.executeOperations.mockReturnValue(mockResult);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(loadConfigSpy).toHaveBeenCalledWith({});
      expect(createLoggerSpy).toHaveBeenCalledWith('info');
      expect(validateDirectorySpy).toHaveBeenCalledWith('.', mockLogger);
      expect(logConfigurationSpy).toHaveBeenCalledWith('/test/dir', false, mockLogger);
      expect(mockScanner.scan).toHaveBeenCalledWith('/test/dir');
      expect(logFileSummarySpy).toHaveBeenCalled();
      expect(mockOrganizer.planOperations).toHaveBeenCalledWith(mockFiles);
      expect(mockOrganizer.executeOperations).toHaveBeenCalledWith(mockOperations);
      expect(logResultsSpy).toHaveBeenCalledWith(mockResult, mockLogger);
      expect(saveManifestsSpy).not.toHaveBeenCalled(); // generateManifest is false
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Organization complete'));
      expect(process.exit).toHaveBeenCalledWith(1); // Failures cause exit
    });

    it('should handle organize command with no files found', async () => {
      // Mock dependencies
      const { FileScanner } = require('../scanner/file-scanner');

      const mockConfig = { dryRun: false, logLevel: 'info' };
      const mockLogger = { info: jest.fn() };
      const mockScanner = { scan: jest.fn() };

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue(mockConfig);
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLogger);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');

      FileScanner.mockImplementation(() => mockScanner);
      mockScanner.scan.mockResolvedValue([]);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(mockLogger.info).toHaveBeenCalledWith('No files found to organize');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Organization complete')
      );
    });

    it('should handle organize command with no operations needed', async () => {
      // Mock dependencies
      const { FileScanner } = require('../scanner/file-scanner');
      const { FileOrganizer } = require('../organizer/file-organizer');

      const mockConfig = { dryRun: false, logLevel: 'info' };
      const mockLogger = { info: jest.fn() };
      const mockScanner = { scan: jest.fn(), getCategorySummary: jest.fn() };
      const mockOrganizer = { planOperations: jest.fn() };
      const mockFiles = [{ path: 'file1.txt' }];

      // Mock private methods
      const loadConfigSpy = jest.spyOn(cliService as any, 'loadConfig');
      loadConfigSpy.mockReturnValue(mockConfig);
      const createLoggerSpy = jest.spyOn(cliService as any, 'createLogger');
      createLoggerSpy.mockReturnValue(mockLogger);
      const validateDirectorySpy = jest.spyOn(cliService as any, 'validateDirectory');
      validateDirectorySpy.mockReturnValue('/test/dir');
      const logConfigurationSpy = jest.spyOn(cliService as any, 'logConfiguration');
      logConfigurationSpy.mockImplementation(() => {});
      const logFileSummarySpy = jest.spyOn(cliService as any, 'logFileSummary');
      logFileSummarySpy.mockImplementation(() => {});

      FileScanner.mockImplementation(() => mockScanner);
      FileOrganizer.mockImplementation(() => mockOrganizer);
      mockScanner.scan.mockResolvedValue(mockFiles);
      mockScanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));
      mockOrganizer.planOperations.mockReturnValue([]);

      // Call the private method directly
      await (cliService as any).handleOrganizeCommand('.', {});

      expect(mockLogger.info).toHaveBeenCalledWith('\n✓ All files are already organized!');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Organization complete')
      );
    });

    describe('loadConfig', () => {
      it('should load config with default values', () => {
        const { ConfigLoader } = require('../config/config-loader');
        ConfigLoader.load.mockReturnValue({ dryRun: false, logLevel: 'info' });

        const result = (cliService as any).loadConfig({});

        expect(ConfigLoader.load).toHaveBeenCalledWith(undefined);
        expect(result).toEqual({ dryRun: false, logLevel: 'info' });
      });

      it('should override config with options', () => {
        const { ConfigLoader } = require('../config/config-loader');
        ConfigLoader.load.mockReturnValue({
          dryRun: false,
          logLevel: 'info',
          generateManifest: true
        });

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
        const path = require('node:path');
        const originalJoin = path.join;
        path.join = jest.fn(() => '/mocked/path/.orderly/orderly.log');

        const { Logger } = require('../logger/logger');
        const mockLogger = { info: jest.fn() };
        Logger.mockImplementation(() => mockLogger);

        const result = (cliService as any).createLogger('info');

        expect(path.join).toHaveBeenCalledWith(process.cwd(), '.orderly', 'orderly.log');
        expect(Logger).toHaveBeenCalledWith('info', '/mocked/path/.orderly/orderly.log');
        expect(result).toBe(mockLogger);

        path.join = originalJoin;
      });
    });

    describe('validateDirectory', () => {
      it('should return resolved path when directory exists', () => {
        const { FileSystemUtils } = require('../utils/file-system-utils');
        FileSystemUtils.existsSync.mockReturnValue(true);

        const mockLogger = { error: jest.fn() };
        const result = (cliService as any).validateDirectory('./test', mockLogger);

        expect(FileSystemUtils.existsSync).toHaveBeenCalledWith(path.resolve('./test'));
        expect(result).toBe(path.resolve('./test'));
        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
      });

      it('should exit when directory does not exist', () => {
        const { FileSystemUtils } = require('../utils/file-system-utils');
        FileSystemUtils.existsSync.mockReturnValue(false);

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
        const path = require('node:path');
        const originalJoin = path.join;
        path.join = jest
          .fn()
          .mockReturnValueOnce(String.raw`C:\test\dir\.orderly`) // manifestDir
          .mockReturnValueOnce(String.raw`C:\test\dir\.orderly\manifest.json`) // json path
          .mockReturnValueOnce(String.raw`C:\test\dir\.orderly\manifest.md`); // md path

        const { ManifestGenerator } = require('../organizer/manifest-generator');
        const mockManifestGenerator = {
          generate: jest.fn().mockReturnValue({}),
          save: jest.fn(),
          saveMarkdown: jest.fn()
        };
        ManifestGenerator.mockImplementation(() => mockManifestGenerator);

        const mockLogger = { info: jest.fn() };
        const result = { successful: 5, failed: 0, errors: [] };

        (cliService as any).saveManifests(result, mockLogger);

        expect(path.join).toHaveBeenCalledWith(process.cwd(), '.orderly');
        expect(path.join).toHaveBeenCalledWith(String.raw`C:\test\dir\.orderly`, 'manifest.json');
        expect(path.join).toHaveBeenCalledWith(String.raw`C:\test\dir\.orderly`, 'manifest.md');
        expect(ManifestGenerator).toHaveBeenCalledWith(mockLogger);
        expect(mockManifestGenerator.generate).toHaveBeenCalledWith(result, []);
        expect(mockManifestGenerator.save).toHaveBeenCalledWith(
          {},
          String.raw`C:\test\dir\.orderly\manifest.json`
        );
        expect(mockManifestGenerator.saveMarkdown).toHaveBeenCalledWith(
          {},
          String.raw`C:\test\dir\.orderly\manifest.md`
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Manifest files created in:')
        );

        path.join = originalJoin;
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
        expect(result).toBe('orderly.config.json');
      });

      it('should return yaml filename for yaml format', () => {
        const result = (cliService as any).getFilename('yaml');
        expect(result).toBe('.orderly.yml');
      });
    });

    describe('displayScanResults', () => {
      it('should display scan results', () => {
        const { FileOrganizer } = require('../organizer/file-organizer');
        const mockScanner = {
          getCategorySummary: jest.fn().mockReturnValue(new Map([['documents', 3]]))
        };
        const mockOrganizer = {
          planOperations: jest
            .fn()
            .mockReturnValue([{ type: 'move' }, { type: 'rename' }, { type: 'move-rename' }])
        };
        FileOrganizer.mockImplementation(() => mockOrganizer);

        const mockLogger = {};
        const config = {};
        const files: IScannedFile[] = [];
        const targetDir = '/test';

        (cliService as any).displayScanResults(mockScanner, files, config, mockLogger, targetDir);

        expect(mockScanner.getCategorySummary).toHaveBeenCalledWith(files);
        expect(FileOrganizer).toHaveBeenCalledWith(config, mockLogger, targetDir);
        expect(mockOrganizer.planOperations).toHaveBeenCalledWith(files);
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
