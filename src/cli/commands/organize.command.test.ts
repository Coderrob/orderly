import { DedupeAction } from '../../dedupe';
import { FileOrganizer } from '../../organizer/file-organizer';
import { FileScanner } from '../../scanner/file-scanner';
import { OrganizeWorkflow } from '../services';
import { OrganizeHandler } from './organize.command';

jest.mock('chalk', () => ({
  blue: jest.fn((value: string) => value),
  green: jest.fn((value: string) => value),
  yellow: jest.fn((value: string) => value),
  red: jest.fn((value: string) => value),
  gray: jest.fn((value: string) => value)
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
  FileScanner: jest.fn().mockImplementation(() => ({ scan: jest.fn() }))
}));

jest.mock('../../organizer/file-organizer', () => ({
  FileOrganizer: jest.fn().mockImplementation(() => ({
    planOperations: jest.fn(),
    executeOperations: jest.fn()
  }))
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
  const mockWorkflow = {
    run: jest.fn()
  };

  let handler: OrganizeHandler;

  beforeEach(() => {
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
    mockWorkflow.run.mockResolvedValue({
      operations: [{ type: 'move' }],
      successful: 1,
      failed: 0,
      skipped: 0,
      errors: []
    });
    handler = new OrganizeHandler(
      mockConfigService as any,
      mockDirectoryValidator as any,
      {
        manifestService: mockManifestService as any,
        cleaner: mockCleaner as any,
        workflow: mockWorkflow as unknown as OrganizeWorkflow
      }
    );
  });

  it('should organize files successfully through the workflow', async () => {
    const result = await handler.execute('/test/dir', { manifest: false });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully organized 1 files');
    expect(mockWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ dryRun: false }),
        targetDir: '/test/dir'
      }),
      { manifest: false }
    );
  });

  it('should create scanner and organizer context for the workflow', async () => {
    await handler.execute('/test/dir', {});

    expect(FileScanner).toHaveBeenCalledTimes(1);
    expect(FileOrganizer).toHaveBeenCalledTimes(1);
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
    expect(mockWorkflow.run).not.toHaveBeenCalled();
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

    const result = await handler.execute('/test/dir', {
      dedupe: true,
      dedupeAction: DedupeAction.REPLACE,
      confirmReplace: true
    });

    expect(result.success).toBe(true);
    expect(mockWorkflow.run).toHaveBeenCalled();
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

    const result = await handler.execute('/test/dir', {
      dedupe: true,
      dedupeAction: DedupeAction.REPLACE,
      quarantineDir: '/test/dir/.orderly/quarantine'
    });

    expect(result.success).toBe(true);
    expect(mockWorkflow.run).toHaveBeenCalled();
  });

  it('should handle workflow errors', async () => {
    mockWorkflow.run.mockRejectedValue(new Error('Scan failed'));

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
    expect(mockWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({ targetDir: '/test/dir' }),
      {}
    );
  });

  it('should log auto-discovered config paths through the private helper', () => {
    const logger = { info: jest.fn() };

    (handler as any).logAutoDiscoveredConfig(logger, '/test/dir/.orderly.yml');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/test/dir/.orderly.yml'));
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
});
