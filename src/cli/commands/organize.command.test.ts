import { OrganizeHandler } from './organize.command';
import { ConfigService } from '../services/config.service';
import { DirectoryValidator } from '../services/directory-validator.service';
import { ManifestService } from '../services/manifest.service';
import type { IOrganizeOptions } from '../interfaces';
import type { OrderlyConfig } from '../../config/types';
import { DEFAULT_CONFIG } from '../../config/types';
import type { IScannedFile } from '../../scanner/interfaces';
import { Logger } from '../../logger/logger';
import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { FileScanner } from '../../scanner/file-scanner';
import { FileOrganizer } from '../../organizer/file-organizer';
import { FileSystemUtils } from '../../utils/file-system-utils';

// Mock chalk before any other imports
jest.mock('chalk', () => ({
  blue: jest.fn(str => str),
  green: jest.fn(str => str),
  yellow: jest.fn(str => str),
  red: jest.fn(str => str),
  gray: jest.fn(str => str)
}));

// Mock the dedupe module
jest.mock('../../dedupe', () => ({
  DedupeMode: {
    ANY: 'any',
    ALL: 'all'
  },
  DedupeAction: {
    SKIP: 'skip',
    REPORT: 'report',
    REPLACE: 'replace'
  }
}));

jest.mock('../../dedupe/dedupe-factory', () => ({
  DedupeStrategyFactory: {
    createDedupeService: jest.fn()
  }
}));

// Mock the logger
jest.mock('../../logger/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock file system related modules
jest.mock('../../scanner/file-scanner', () => ({
  FileScanner: jest.fn()
}));

jest.mock('../../organizer/file-organizer', () => ({
  FileOrganizer: jest.fn()
}));

jest.mock('../../utils/file-system-utils', () => {
  const actual = jest.requireActual('../../utils/file-system-utils');
  return {
    ...actual,
    FileSystemUtils: {
      hasPath: actual.FileSystemUtils.hasPath,
      unlinkSync: jest.fn()
    }
  };
});

/**
 * Unit tests for the organize command dedupe functionality.
 * Tests the integration logic without file system operations.
 */
describe('OrganizeHandler - Dedupe Integration', () => {
  let organizeHandler: OrganizeHandler;
  let configService: ConfigService;
  let directoryValidator: DirectoryValidator;
  let manifestService: ManifestService;
  let mockDedupeService: {
    applyAction: jest.Mock;
    findDuplicates: jest.Mock;
  };
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    configService = new ConfigService();
    directoryValidator = new DirectoryValidator();
    manifestService = new ManifestService();

    // Set up mock implementations
    mockDedupeService = {
      findDuplicates: jest.fn(),
      applyAction: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      getLogs: jest.fn(),
      clearLogs: jest.fn()
    } as any;

    // Mock the constructors
    jest
      .mocked(DedupeStrategyFactory.createDedupeService)
      .mockReturnValue(mockDedupeService as any);
    (Logger as jest.Mock).mockImplementation(() => mockLogger);

    organizeHandler = new OrganizeHandler(configService, directoryValidator, manifestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDuplicates method', () => {
    const mockFiles: IScannedFile[] = [
      {
        originalPath: '/path/file1.txt',
        filename: 'file1.txt',
        extension: '.txt',
        size: 100,
        needsRename: false
      },
      {
        originalPath: '/path/file2.txt',
        filename: 'file2.txt',
        extension: '.txt',
        size: 100,
        needsRename: false
      }
    ];

    const mockConfig: OrderlyConfig = {
      dedupe: {
        enabled: true,
        action: 'skip'
      }
    } as OrderlyConfig;

    it('should filter out duplicate files when action is SKIP', async () => {
      // Mock dedupe result with duplicates
      const mockDedupeResult = {
        groups: [
          {
            key: 'duplicate-group-1',
            files: [mockFiles[0], mockFiles[1]],
            strategy: 'name'
          }
        ],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      };

      const mockDedupeOutcome = {
        action: DedupeAction.SKIP,
        skipped: [mockFiles[1]],
        replaced: [],
        reported: [],
        errors: []
      };

      mockDedupeService.findDuplicates.mockResolvedValue(mockDedupeResult);
      mockDedupeService.applyAction.mockResolvedValue(mockDedupeOutcome);

      // Access the private method for testing
      const processDuplicates = (organizeHandler as any).processDuplicates.bind(organizeHandler);

      const result = await processDuplicates(mockFiles, mockConfig, mockLogger);

      expect(mockDedupeService.findDuplicates).toHaveBeenCalledWith(mockFiles);
      expect(mockDedupeService.applyAction).toHaveBeenCalledWith(mockDedupeResult, 'skip');
      expect(mockLogger.info).toHaveBeenCalledWith('Running duplicate detection...');
      expect(mockLogger.info).toHaveBeenCalledWith('Found 2 duplicate files in 1 groups');
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Dedupe action 'skip' applied: 1 files affected"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Kept 1 primary files, filtered out 1 duplicate files'
      );
      expect(result).toHaveLength(1); // One primary file kept, one duplicate filtered out
    });

    it('should not filter files when action is REPORT', async () => {
      const reportConfig = {
        ...mockConfig,
        dedupe: { ...mockConfig.dedupe, action: 'report' as const }
      };

      const mockDedupeResult = {
        groups: [
          {
            key: 'duplicate-group-1',
            files: [mockFiles[0], mockFiles[1]],
            strategy: 'name'
          }
        ],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      };

      const mockDedupeOutcome = {
        action: DedupeAction.REPORT,
        skipped: [],
        replaced: [],
        reported: [mockDedupeResult.groups[0]],
        errors: []
      };

      mockDedupeService.findDuplicates.mockResolvedValue(mockDedupeResult);
      mockDedupeService.applyAction.mockResolvedValue(mockDedupeOutcome);

      const processDuplicates = (organizeHandler as any).processDuplicates.bind(organizeHandler);

      const result = await processDuplicates(mockFiles, reportConfig, mockLogger);

      expect(result).toEqual(mockFiles); // All files returned unchanged
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Dedupe action 'report' applied: 0 files affected"
      );
    });

    it('should delete duplicate files when action is REPLACE', async () => {
      const replaceConfig = {
        ...mockConfig,
        dryRun: false,
        dedupe: { ...mockConfig.dedupe, action: 'replace' as const }
      } as OrderlyConfig;

      const mockDedupeResult = {
        groups: [
          {
            key: 'duplicate-group-1',
            files: [mockFiles[0], mockFiles[1]],
            strategy: 'name'
          }
        ],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      };

      const mockDedupeOutcome = {
        action: DedupeAction.REPLACE,
        skipped: [],
        replaced: [mockFiles[1]],
        reported: [],
        errors: []
      };

      mockDedupeService.findDuplicates.mockResolvedValue(mockDedupeResult);
      mockDedupeService.applyAction.mockResolvedValue(mockDedupeOutcome);

      const processDuplicates = (organizeHandler as any).processDuplicates.bind(organizeHandler);

      const result = await processDuplicates(mockFiles, replaceConfig, mockLogger);

      expect(FileSystemUtils.unlinkSync).toHaveBeenCalledWith('/path/file2.txt');
      expect(result).toEqual([mockFiles[0]]);
      expect(mockLogger.info).toHaveBeenCalledWith('Removed 1 duplicate files before organization');
    });

    it('should not delete duplicate files during dry-run replace', async () => {
      const replaceConfig = {
        ...mockConfig,
        dryRun: true,
        dedupe: { ...mockConfig.dedupe, action: 'replace' as const }
      } as OrderlyConfig;

      const mockDedupeResult = {
        groups: [
          {
            key: 'duplicate-group-1',
            files: [mockFiles[0], mockFiles[1]],
            strategy: 'name'
          }
        ],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      };

      const mockDedupeOutcome = {
        action: DedupeAction.REPLACE,
        skipped: [],
        replaced: [mockFiles[1]],
        reported: [],
        errors: []
      };

      mockDedupeService.findDuplicates.mockResolvedValue(mockDedupeResult);
      mockDedupeService.applyAction.mockResolvedValue(mockDedupeOutcome);

      const processDuplicates = (organizeHandler as any).processDuplicates.bind(organizeHandler);

      const result = await processDuplicates(mockFiles, replaceConfig, mockLogger);

      expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
      expect(result).toEqual([mockFiles[0]]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Would remove 1 duplicate files before organization'
      );
    });

    it('should return all files when no duplicates found', async () => {
      const mockDedupeResult = {
        groups: [],
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: []
      };

      mockDedupeService.findDuplicates.mockResolvedValue(mockDedupeResult);

      const processDuplicates = (organizeHandler as any).processDuplicates.bind(organizeHandler);

      const result = await processDuplicates(mockFiles, mockConfig, mockLogger);

      expect(result).toEqual(mockFiles);
      expect(mockDedupeService.applyAction).not.toHaveBeenCalled();
    });
  });

  describe('configuration integration', () => {
    it('should enable dedupe when dedupe option is true', () => {
      const options: IOrganizeOptions = {
        dedupe: true
      };

      const config = configService.loadWithOverrides(options);
      expect(config.dedupe?.enabled).toBe(true);
    });

    it('should set dedupe action when specified', () => {
      const options: IOrganizeOptions = {
        dedupe: true,
        dedupeAction: 'report'
      };

      const config = configService.loadWithOverrides(options);
      expect(config.dedupe?.action).toBe('report');
    });

    it('should default dedupe action to skip', () => {
      const options: IOrganizeOptions = {
        dedupe: true
      };

      const config = configService.loadWithOverrides(options);
      expect(config.dedupe?.action).toBe('skip');
    });

    it('should disable dedupe by default', () => {
      const options: IOrganizeOptions = {};

      const config = configService.loadWithOverrides(options);
      expect(config.dedupe?.enabled).toBeFalsy();
    });
  });

  describe('execute', () => {
    it('should organize files successfully', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        logLevel: 'info' as any,
        dedupe: {
          enabled: false,
          recursive: false,
          strategy: { mode: 'any' as any },
          action: 'skip' as any
        }
      };
      const targetDir = '/test/dir';
      const files = [{ filename: 'file1.txt' } as IScannedFile];
      const operations = [{ type: 'move' as any }];
      const result = { operations, successful: 1, failed: 0, errors: [] };

      jest.spyOn(configService, 'loadWithOverrides').mockReturnValue(config);
      jest.spyOn(directoryValidator, 'validate').mockReturnValue(targetDir);

      (FileScanner as jest.Mock).mockImplementation(() => ({
        scan: jest.fn().mockResolvedValue(files),
        getCategorySummary: jest.fn()
      }));

      (FileOrganizer as jest.Mock).mockImplementation(() => ({
        planOperations: jest.fn().mockReturnValue(operations),
        executeOperations: jest.fn().mockReturnValue(result)
      }));

      const cmdResult = await organizeHandler.execute(targetDir, { manifest: false });

      expect(cmdResult.success).toBe(true);
      expect(cmdResult.exitCode).toBe(0);
      expect(cmdResult.message).toContain('Successfully organized 1 files');
    });

    it('should handle error', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        logLevel: 'info' as any,
        dedupe: {
          enabled: false,
          recursive: false,
          strategy: { mode: 'any' as any },
          action: 'skip' as any
        }
      };
      const targetDir = '/test/dir';

      jest.spyOn(configService, 'loadWithOverrides').mockReturnValue(config);
      jest.spyOn(directoryValidator, 'validate').mockReturnValue(targetDir);

      (FileScanner as jest.Mock).mockImplementation(() => ({
        scan: jest.fn().mockRejectedValue(new Error('Scan failed')),
        getCategorySummary: jest.fn()
      }));

      const cmdResult = await organizeHandler.execute(targetDir, {});

      expect(cmdResult.success).toBe(false);
      expect(cmdResult.exitCode).toBe(1);
      expect(cmdResult.message).toContain('Organization failed: Scan failed');
    });
  });
});

describe('OrganizeHandler - Execute', () => {
  let mockConfigService: any;
  let mockDirectoryValidator: any;
  let mockManifestService: any;
  let handler: OrganizeHandler;
  let mockLoggerInstance: any;

  beforeEach(() => {
    mockLoggerInstance = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      getLogs: jest.fn(),
      clearLogs: jest.fn()
    };
    (Logger as jest.Mock).mockImplementation(() => mockLoggerInstance);

    mockConfigService = {
      loadWithOverrides: jest.fn(),
      findConfigInDirectory: jest.fn()
    };
    mockDirectoryValidator = {
      validate: jest.fn()
    };
    mockManifestService = {
      saveManifests: jest.fn()
    };
    handler = new OrganizeHandler(mockConfigService, mockDirectoryValidator, mockManifestService);
  });

  it('should organize files successfully', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const operations = [{ type: 'move' as any }];
    const result = { operations, successful: 1, failed: 0, errors: [] };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    const cmdResult = await handler.execute(targetDir, { manifest: false });

    expect(cmdResult.success).toBe(true);
    expect(cmdResult.exitCode).toBe(0);
    expect(cmdResult.message).toContain('Successfully organized 1 files');
  });

  it('should log auto-discovered config via logger instead of console.log', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';
    const discoveredConfig = '/test/dir/.orderly.yml';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const operations = [{ type: 'move' as any }];
    const result = { operations, successful: 1, failed: 0, errors: [] };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);
    mockConfigService.findConfigInDirectory.mockReturnValue(discoveredConfig);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    await handler.execute(targetDir, {});

    expect(mockLoggerInstance.info).toHaveBeenCalledWith(
      `Using config file found in target directory: ${discoveredConfig}`
    );
  });

  it('should not log auto-discovery message when config is explicitly provided', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const operations = [{ type: 'move' as any }];
    const result = { operations, successful: 1, failed: 0, errors: [] };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    await handler.execute(targetDir, { config: '/explicit/config.yml', manifest: false });

    expect(mockConfigService.findConfigInDirectory).not.toHaveBeenCalled();
    expect(mockLoggerInstance.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Using config file found in target directory:')
    );
  });

  it('should not auto-discover config when autoConfig is false', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const operations = [{ type: 'move' as any }];
    const result = { operations, successful: 1, failed: 0, skipped: 0, errors: [] };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    await handler.execute(targetDir, { autoConfig: false, manifest: false });

    expect(mockConfigService.findConfigInDirectory).not.toHaveBeenCalled();
  });

  it('should handle error', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockRejectedValue(new Error('Scan failed')),
      getCategorySummary: jest.fn()
    }));

    const cmdResult = await handler.execute(targetDir, {});

    expect(cmdResult.success).toBe(false);
    expect(cmdResult.exitCode).toBe(1);
    expect(cmdResult.message).toContain('Organization failed: Scan failed');
  });

  it('should handle dedupe enabled', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: true, action: 'skip' as any } };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const dedupedFiles = files;
    const operations = [{ type: 'move' as any }];
    const result = { operations, successful: 1, failed: 0, errors: [] };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    // Mock dedupe
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 1,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn().mockReturnValue(dedupedFiles)
    } as any);

    const cmdResult = await handler.execute(targetDir, {});

    expect(cmdResult.success).toBe(true);
    expect(cmdResult.exitCode).toBe(0);
  });

  it('should handle manifest generation', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const operations = [{ type: 'move' as any }];
    const result = { operations, successful: 1, failed: 0, errors: [] };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    const cmdResult = await handler.execute(targetDir, { manifest: true });

    expect(cmdResult.success).toBe(true);
    expect(cmdResult.exitCode).toBe(0);
    expect(mockManifestService.saveManifests).toHaveBeenCalledWith(result, targetDir);
  });

  it('should handle result with errors', async () => {
    const config = { logLevel: 'info' as any, dedupe: { enabled: false } };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt' } as IScannedFile];
    const operations = [{ type: 'move' as any }];
    const result = {
      operations,
      successful: 1,
      failed: 0,
      errors: [{ file: 'file1.txt', error: 'error' }]
    };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);

    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue(files),
      getCategorySummary: jest.fn()
    }));

    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue(operations),
      executeOperations: jest.fn().mockReturnValue(result)
    }));

    const cmdResult = await handler.execute(targetDir, { manifest: false });

    expect(cmdResult.success).toBe(true);
    expect(cmdResult.exitCode).toBe(0);
  });
});
