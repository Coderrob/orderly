import { FileSystemUtils } from '../../utils/file-system-utils';
import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { DedupeHandler } from './dedupe.command';

jest.mock('../../dedupe/dedupe-factory', () => ({
  DedupeStrategyFactory: {
    createDedupeService: jest.fn()
  }
}));

jest.mock('../../scanner/file-scanner', () => ({
  FileScanner: jest.fn().mockImplementation(() => ({
    scan: jest.fn().mockResolvedValue([
      {
        originalPath: '/target/a.txt',
        filename: 'a.txt',
        extension: '.txt',
        size: 10,
        needsRename: false
      },
      {
        originalPath: '/target/b.txt',
        filename: 'b.txt',
        extension: '.txt',
        size: 10,
        needsRename: false
      }
    ])
  }))
}));

jest.mock('../../utils/file-system-utils', () => ({
  FileSystemUtils: {
    unlinkSync: jest.fn()
  }
}));

describe('DedupeHandler', () => {
  const mockConfigService = {
    findConfigInDirectory: jest.fn(),
    loadWithOverrides: jest.fn()
  };
  const mockDirectoryValidator = {
    validate: jest.fn()
  };
  const mockReportWriter = {
    write: jest.fn().mockResolvedValue(undefined),
    writeMarkdown: jest.fn().mockResolvedValue(undefined)
  };

  let handler: DedupeHandler;

  beforeEach(() => {
    handler = new DedupeHandler(
      mockConfigService as any,
      mockDirectoryValidator as any,
      mockReportWriter as any
    );
    jest.clearAllMocks();
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
    mockDirectoryValidator.validate.mockReturnValue('/target');
  });

  it('should write default reports for report action', async () => {
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [{ key: 'key', strategy: 'name', files: [{ originalPath: '/target/a.txt' }] }],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        action: DedupeAction.REPORT,
        skipped: [],
        replaced: [],
        reported: [],
        errors: []
      })
    } as any);

    const result = await handler.execute('/target', {});

    expect(result.success).toBe(true);
    expect(mockReportWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({ totalFiles: 2 }),
      expect.stringContaining('.orderly')
    );
    expect(mockReportWriter.writeMarkdown).toHaveBeenCalled();
  });

  it('should delete duplicates for replace action', async () => {
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
        groups: [{ key: 'key', strategy: 'name', files: [] }],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        action: DedupeAction.REPLACE,
        skipped: [],
        replaced: [
          {
            originalPath: '/target/b.txt',
            filename: 'b.txt',
            extension: '.txt',
            size: 10,
            needsRename: false
          }
        ],
        reported: [],
        errors: []
      })
    } as any);

    const result = await handler.execute('/target', { action: 'replace' });

    expect(result.success).toBe(true);
    expect(FileSystemUtils.unlinkSync).toHaveBeenCalledWith('/target/b.txt');
  });

  it('should skip report writing when action is skip and no report path is provided', async () => {
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
        groups: [],
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        action: DedupeAction.SKIP,
        skipped: [],
        replaced: [],
        reported: [],
        errors: []
      })
    } as any);

    await handler.execute('/target', { action: 'skip' });

    expect(mockReportWriter.write).not.toHaveBeenCalled();
    expect(mockReportWriter.writeMarkdown).not.toHaveBeenCalled();
    expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
  });

  it('should honor custom report paths for non-report actions', async () => {
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        action: DedupeAction.SKIP,
        skipped: [],
        replaced: [],
        reported: [],
        errors: []
      })
    } as any);

    await handler.execute('/target', {
      action: 'skip',
      reportJson: '/reports/out.json',
      reportMarkdown: '/reports/out.md'
    });

    expect(mockReportWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({ totalFiles: 2 }),
      '/reports/out.json'
    );
    expect(mockReportWriter.writeMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({ totalFiles: 2 }),
      '/reports/out.md'
    );
  });

  it('should not delete duplicates during dry-run replace', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: true,
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
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn()
    } as any);

    await handler.execute('/target', { action: 'replace', dryRun: true });

    expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
  });

  it('should return failure when duplicate deletion fails', async () => {
    (FileSystemUtils.unlinkSync as jest.Mock).mockImplementation(() => {
      throw new Error('delete failed');
    });
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
        groups: [{ key: 'key', strategy: 'name', files: [] }],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        action: DedupeAction.REPLACE,
        skipped: [],
        replaced: [
          {
            originalPath: '/target/b.txt',
            filename: 'b.txt',
            extension: '.txt',
            size: 10,
            needsRename: false
          }
        ],
        reported: [],
        errors: []
      })
    } as any);

    const result = await handler.execute('/target', { action: 'replace' });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('should fall back to report action for unsupported actions', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info',
      excludePatterns: [],
      categories: [],
      namingConvention: { type: 'kebab-case' },
      generateManifest: false
    });
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn()
    } as any);

    const result = await handler.execute('/target', { action: 'unsupported' });

    expect(result.success).toBe(true);
    expect(mockReportWriter.write).toHaveBeenCalled();
    expect(mockReportWriter.writeMarkdown).toHaveBeenCalled();
  });

  it('should accept an auto-discovered config context', async () => {
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn()
    } as any);

    const result = await handler.execute(
      '/ignored',
      {},
      {
        autoDiscoveredConfig: '/target/.orderly.yml',
        configOptions: {},
        targetDir: '/target'
      }
    );

    expect(result.success).toBe(true);
  });
});
