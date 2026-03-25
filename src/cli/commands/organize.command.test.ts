import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import { FileScanner } from '../../scanner/file-scanner';
import { OrganizeHandler } from './organize.command';

jest.mock('chalk', () => ({
  blue: jest.fn((value: string) => value),
  green: jest.fn((value: string) => value),
  yellow: jest.fn((value: string) => value),
  red: jest.fn((value: string) => value),
  gray: jest.fn((value: string) => value)
}));

jest.mock('../../dedupe/dedupe-factory', () => ({
  DedupeStrategyFactory: {
    createDedupeService: jest.fn()
  }
}));

jest.mock('../../logger/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('../../scanner/file-scanner', () => ({
  FileScanner: jest.fn()
}));

jest.mock('../../organizer/file-organizer', () => ({
  FileOrganizer: jest.fn()
}));

describe('OrganizeHandler', () => {
  const mockConfigService = {
    loadWithOverrides: jest.fn(),
    findConfigInDirectory: jest.fn()
  };
  const mockDirectoryValidator = {
    validate: jest.fn()
  };
  const mockManifestService = {
    saveManifests: jest.fn()
  };
  const mockCleaner = {
    clean: jest.fn()
  };

  let handler: OrganizeHandler;

  beforeEach(() => {
    handler = new OrganizeHandler(
      mockConfigService as any,
      mockDirectoryValidator as any,
      mockManifestService as any,
      mockCleaner as any
    );
    jest.clearAllMocks();
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false,
      dedupe: {
        enabled: false,
        recursive: false,
        strategy: { mode: 'any' },
        action: 'skip'
      }
    });
    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue([
        {
          originalPath: '/test/dir/file1.txt',
          filename: 'file1.txt',
          extension: '.txt',
          size: 10,
          needsRename: false
        }
      ])
    }));
    (FileOrganizer as jest.Mock).mockImplementation(() => ({
      planOperations: jest.fn().mockReturnValue([{ type: 'move' }]),
      executeOperations: jest.fn().mockReturnValue({
        operations: [
          {
            type: 'move',
            originalPath: '/test/dir/file1.txt',
            newPath: '/test/dir/documents/file1.txt',
            reason: 'categorized'
          }
        ],
        successful: 1,
        failed: 0,
        skipped: 0,
        errors: []
      })
    }));
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 1,
      removedDirectories: 1,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });
  });

  it('should organize files successfully', async () => {
    const result = await handler.execute('/test/dir', { manifest: false });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully organized 1 files');
  });

  it('should run post-organize cleanup when requested', async () => {
    await handler.execute('/test/dir', { cleanEmptyDirs: true });

    expect(mockCleaner.clean).toHaveBeenCalledWith(
      '/test/dir',
      expect.objectContaining({
        dryRun: false,
        includeHidden: false,
        removeOrderlyDir: false
      })
    );
  });

  it('should save manifests when requested', async () => {
    await handler.execute('/test/dir', { manifest: true });

    expect(mockManifestService.saveManifests).toHaveBeenCalled();
  });

  it('should block destructive replace without confirmation or quarantine', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false,
      dedupe: {
        enabled: true,
        recursive: false,
        strategy: { mode: 'any' },
        action: 'replace'
      }
    });

    const result = await handler.execute('/test/dir', { dedupe: true, dedupeAction: 'replace' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('--confirm-replace');
  });

  it('should continue when replace is explicitly confirmed', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false,
      dedupe: {
        enabled: true,
        recursive: false,
        strategy: { mode: 'any' },
        action: 'replace'
      }
    });
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 1,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn()
    } as any);

    const result = await handler.execute('/test/dir', {
      dedupe: true,
      dedupeAction: DedupeAction.REPLACE,
      confirmReplace: true
    });

    expect(result.success).toBe(true);
  });

  it('should continue when replace uses a quarantine directory', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false,
      dedupe: {
        enabled: true,
        recursive: false,
        strategy: { mode: 'any' },
        action: 'replace'
      }
    });
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 1,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn()
    } as any);

    const result = await handler.execute('/test/dir', {
      dedupe: true,
      dedupeAction: DedupeAction.REPLACE,
      quarantineDir: '/test/dir/.orderly/quarantine'
    });

    expect(result.success).toBe(true);
  });

  it('should keep all files when dedupe is disabled', async () => {
    const organizer = {
      planOperations: jest.fn().mockReturnValue([{ type: 'move' }]),
      executeOperations: jest.fn().mockReturnValue({
        operations: [{ type: 'move' }],
        successful: 1,
        failed: 0,
        skipped: 0,
        errors: []
      })
    };
    (FileOrganizer as jest.Mock).mockImplementation(() => organizer);

    await handler.execute('/test/dir', {});

    expect(organizer.planOperations).toHaveBeenCalledWith([
      expect.objectContaining({ originalPath: '/test/dir/file1.txt' })
    ]);
  });

  it('should filter skipped duplicates before planning operations', async () => {
    const organizer = {
      planOperations: jest.fn().mockReturnValue([{ type: 'move' }]),
      executeOperations: jest.fn().mockReturnValue({
        operations: [{ type: 'move' }],
        successful: 1,
        failed: 0,
        skipped: 0,
        errors: []
      })
    };
    (FileOrganizer as jest.Mock).mockImplementation(() => organizer);
    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockResolvedValue([
        {
          originalPath: '/test/dir/file1.txt',
          filename: 'file1.txt',
          extension: '.txt',
          size: 10,
          requiresRename: false
        },
        {
          originalPath: '/test/dir/file2.txt',
          filename: 'file2.txt',
          extension: '.txt',
          size: 10,
          requiresRename: false
        }
      ])
    }));
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false,
      dedupe: {
        enabled: true,
        recursive: false,
        strategy: { mode: 'any' },
        action: 'skip'
      }
    });
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [{ files: [{}, {}] }],
        totalFiles: 2,
        totalDuplicates: 1,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        skipped: [
          {
            originalPath: '/test/dir/file2.txt',
            filename: 'file2.txt',
            extension: '.txt',
            size: 10,
            requiresRename: false
          }
        ],
        replaced: []
      })
    } as any);

    await handler.execute('/test/dir', { dedupe: true, dedupeAction: 'skip' });

    expect(organizer.planOperations).toHaveBeenCalledWith([
      expect.objectContaining({ originalPath: '/test/dir/file1.txt' })
    ]);
  });

  it('should keep all files when dedupe finds no groups', async () => {
    const organizer = {
      planOperations: jest.fn().mockReturnValue([{ type: 'move' }]),
      executeOperations: jest.fn().mockReturnValue({
        operations: [{ type: 'move' }],
        successful: 1,
        failed: 0,
        skipped: 0,
        errors: []
      })
    };
    (FileOrganizer as jest.Mock).mockImplementation(() => organizer);
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false,
      dedupe: {
        enabled: true,
        recursive: false,
        strategy: { mode: 'any' },
        action: 'report'
      }
    });
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 1,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn()
    } as any);

    await handler.execute('/test/dir', { dedupe: true });

    expect(organizer.planOperations).toHaveBeenCalledWith([
      expect.objectContaining({ originalPath: '/test/dir/file1.txt' })
    ]);
  });

  it('should handle execution errors', async () => {
    (FileScanner as jest.Mock).mockImplementation(() => ({
      scan: jest.fn().mockRejectedValue(new Error('Scan failed'))
    }));

    const result = await handler.execute('/test/dir', {});

    expect(result.success).toBe(false);
    expect(result.message).toContain('Organization failed: Scan failed');
  });

  it('should accept auto-discovered config context', async () => {
    const result = await handler.execute(
      '/ignored',
      {},
      {
        autoDiscoveredConfig: '/test/dir/.orderly.yml',
        configOptions: {},
        targetDir: '/test/dir'
      }
    );

    expect(result.success).toBe(true);
  });

  it('should log auto-discovered config paths through the private helper', () => {
    const logger = { info: jest.fn() };

    (handler as any).logAutoDiscoveredConfig(logger, '/test/dir/.orderly.yml');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/test/dir/.orderly.yml'));
  });

  it('should log organization errors through the private result logger', () => {
    const logger = { info: jest.fn(), warn: jest.fn() };

    (handler as any).logResults(
      {
        successful: 1,
        failed: 1,
        skipped: 0,
        errors: [{ file: '/test/dir/file1.txt', error: 'denied' }]
      },
      logger
    );

    expect(logger.warn).toHaveBeenCalledWith('1 errors occurred during organization');
    expect(logger.warn).toHaveBeenCalledWith('  1. /test/dir/file1.txt: denied');
  });

  it('should return all files for report dedupe actions', () => {
    const result = (handler as any).resolveDedupeFilesForAction({
      action: DedupeAction.REPORT,
      files: [{ originalPath: '/test/dir/file1.txt' }],
      filteredFiles: [{ originalPath: '/test/dir/file1.txt' }],
      dedupeOutcome: { skipped: [], replaced: [] },
      dedupeGroupCount: 0,
      deleteDuplicates: false,
      logger: { info: jest.fn() }
    });

    expect(result).toEqual([{ originalPath: '/test/dir/file1.txt' }]);
  });

  it('should resolve replace dedupe actions through the replacement helper', () => {
    const logger = { info: jest.fn() };

    const result = (handler as any).resolveDedupeFilesForAction({
      action: DedupeAction.REPLACE,
      files: [{ originalPath: '/test/dir/file1.txt' }],
      filteredFiles: [{ originalPath: '/test/dir/file1.txt' }],
      dedupeOutcome: {
        skipped: [],
        replaced: [{ originalPath: '/test/dir/file2.txt', filename: 'file2.txt' }]
      },
      dedupeGroupCount: 1,
      deleteDuplicates: false,
      quarantineDir: '/test/dir/.orderly/quarantine',
      logger
    });

    expect(result).toEqual([{ originalPath: '/test/dir/file1.txt' }]);
    expect(logger.info).toHaveBeenCalledWith('Would remove 1 duplicate files before organization');
  });

  it('should allow organize replace when config is in dry-run mode', () => {
    const result = (handler as any).validateReplaceSafety(
      {
        dedupe: {
          enabled: true,
          action: DedupeAction.REPLACE
        },
        dryRun: true
      },
      {}
    );

    expect(result).toBeUndefined();
  });

  it('should skip cleanup when cleanEmptyDirs is disabled', () => {
    const logger = { info: jest.fn() };

    (handler as any).cleanEmptyDirectoriesIfRequested(
      { cleanEmptyDirs: false },
      {
        config: { dryRun: false, includeHidden: false },
        logger,
        targetDir: '/test/dir'
      }
    );

    expect(mockCleaner.clean).not.toHaveBeenCalled();
  });

  it('should skip cleanup when no cleaner is configured', () => {
    const handlerWithoutCleaner = new OrganizeHandler(
      mockConfigService as any,
      mockDirectoryValidator as any,
      mockManifestService as any
    );

    expect(() =>
      (handlerWithoutCleaner as any).cleanEmptyDirectoriesIfRequested(
        { cleanEmptyDirs: true },
        {
          config: { dryRun: false, includeHidden: false },
          logger: { info: jest.fn() },
          targetDir: '/test/dir'
        }
      )
    ).not.toThrow();
  });

  it('should skip manifest generation when manifest is false', () => {
    (handler as any).saveManifestIfRequested(
      { operations: [] },
      { manifest: false },
      { info: jest.fn() },
      '/test/dir'
    );

    expect(mockManifestService.saveManifests).not.toHaveBeenCalled();
  });

  it('should return all files when processDuplicates receives no dedupe config', async () => {
    const files = [{ originalPath: '/test/dir/file1.txt' }];

    const result = await (handler as any).processDuplicates(files, {}, { info: jest.fn() }, {});

    expect(result).toEqual(files);
  });
});
