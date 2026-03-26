import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system-utils';
import { Clock } from '../../utils/clock';
import { DedupeAction, DedupeMode } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import {
  createDedupeConfigOverrides,
  createReportWrites,
  DedupePreset,
  getDefaultReportPath,
  normalizeDedupeCommandOptions,
  resolveAction,
  resolveDedupeConfig,
  resolvePreset,
  resolveQuarantinePath,
  resolveStrategyPreset,
  shouldDeleteDuplicates,
  validateReplaceSafety
} from './dedupe.command.helpers';
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
    hasPath: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    renameSync: jest.fn(),
    unlinkSync: jest.fn()
  }
}));

jest.mock('../../utils/clock', () => ({
  Clock: {
    nowMonotonicMs: jest.fn().mockReturnValue(1000),
    nowMonotonicToken: jest.fn().mockReturnValue('token')
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
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [
          {
            key: 'key',
            strategy: 'name',
            strategies: ['name'],
            files: [{ originalPath: '/target/a.txt', filename: 'a.txt', size: 10 }],
            primary: { originalPath: '/target/a.txt', size: 10 }
          }
        ],
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
  });

  it('should write default reports for report action', async () => {
    const result = await handler.execute('/target', {});

    expect(result.success).toBe(true);
    expect(mockReportWriter.write).toHaveBeenCalled();
    expect(mockReportWriter.writeMarkdown).toHaveBeenCalled();
  });

  it('should support the fast preset', async () => {
    await handler.execute('/target', { preset: 'fast' });

    expect(DedupeStrategyFactory.createDedupeService).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: expect.objectContaining({
          mode: 'any',
          size: true,
          name: expect.objectContaining({ caseSensitive: false, ignoreExtension: false })
        })
      })
    );
  });

  it('should support the exact preset', async () => {
    await handler.execute('/target', { preset: 'exact' });

    expect(DedupeStrategyFactory.createDedupeService).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: expect.objectContaining({ mode: 'all', size: true, sha256: true })
      })
    );
  });

  it('should treat the safe preset as exact matching', async () => {
    await handler.execute('/target', { preset: 'safe' });

    expect(DedupeStrategyFactory.createDedupeService).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: expect.objectContaining({ mode: 'all', size: true, sha256: true })
      })
    );
  });

  it('should honor the skip action override', async () => {
    await handler.execute('/target', { action: 'skip' });

    expect(DedupeStrategyFactory.createDedupeService).toHaveBeenCalledWith(
      expect.objectContaining({ action: DedupeAction.SKIP })
    );
    expect(mockReportWriter.write).not.toHaveBeenCalled();
    expect(mockReportWriter.writeMarkdown).not.toHaveBeenCalled();
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

    const result = await handler.execute('/target', { action: 'replace' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('--confirm-replace');
    expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
  });

  it('should delete duplicates for replace action when confirmed', async () => {
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

    const result = await handler.execute('/target', {
      action: 'replace',
      confirmReplace: true
    });

    expect(result.success).toBe(true);
    expect(FileSystemUtils.unlinkSync).toHaveBeenCalledWith('/target/b.txt');
  });

  it('should skip deletions for replace action during dry-run execution', async () => {
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

    const result = await handler.execute('/target', {
      action: 'replace',
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
  });

  it('should quarantine duplicates when quarantine directory is provided', async () => {
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

    const result = await handler.execute('/target', {
      action: 'replace',
      quarantineDir: '/target/.orderly/quarantine'
    });

    expect(result.success).toBe(true);
    expect(FileSystemUtils.renameSync).toHaveBeenCalledWith(
      '/target/b.txt',
      path.resolve('/target/.orderly/quarantine', 'b.txt')
    );
  });

  it('should create a unique quarantine filename when the destination already exists', async () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(true);

    await handler.execute('/target', {
      action: 'replace',
      quarantineDir: '/target/.orderly/quarantine'
    });

    expect(Clock.nowMonotonicToken).toHaveBeenCalled();
    expect(FileSystemUtils.renameSync).toHaveBeenCalledWith(
      '/target/b.txt',
      path.resolve('/target/.orderly/quarantine', 'token-b.txt')
    );
  });

  it('should surface delete errors as command failure', async () => {
    jest.mocked(FileSystemUtils.unlinkSync).mockImplementation(() => {
      throw new Error('unlink failed');
    });

    const result = await handler.execute('/target', {
      action: 'replace',
      confirmReplace: true
    });

    expect(result.success).toBe(false);
  });

  it('should surface quarantine errors for non-Error failures', async () => {
    jest.mocked(FileSystemUtils.renameSync).mockImplementation(() => {
      throw 'rename failed';
    });

    const result = await handler.execute('/target', {
      action: 'replace',
      quarantineDir: '/target/.orderly/quarantine'
    });

    expect(result.success).toBe(false);
  });

  it('should accept a strategy preset override', async () => {
    await handler.execute('/target', { preset: 'media' });

    expect(DedupeStrategyFactory.createDedupeService).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: expect.objectContaining({
          imageDimensions: true,
          exif: true
        })
      })
    );
  });

  it('should write explicit reports even when the active action is replace', async () => {
    await handler.execute('/target', {
      action: 'replace',
      confirmReplace: true,
      reportJson: '/tmp/report.json',
      reportMarkdown: '/tmp/report.md'
    });

    expect(mockReportWriter.write).toHaveBeenCalledWith(expect.anything(), '/tmp/report.json');
    expect(mockReportWriter.writeMarkdown).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/report.md'
    );
  });

  it('should log auto-discovered config paths through the private helper', () => {
    const logger = { info: jest.fn() };

    (handler as any).logAutoDiscoveredConfig(logger, '/target/.orderly.yml');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/target/.orderly.yml'));
  });

  it('should resolve the explicit report action through the helper', () => {
    const action = resolveAction('report');

    expect(action).toBe(DedupeAction.REPORT);
  });

  it('should return undefined for unsupported presets and actions through helpers', () => {
    expect(resolveStrategyPreset(undefined)).toBeUndefined();
    expect(resolveAction('unknown')).toBeUndefined();
    expect(resolvePreset('unknown')).toBeUndefined();
  });

  it('should fall back to default report action and strategy when no config is present', () => {
    const result = resolveDedupeConfig(undefined, undefined, undefined);

    expect(result).toEqual({
      enabled: true,
      recursive: false,
      strategy: { mode: 'any' },
      action: DedupeAction.REPORT
    });
  });

  it('should reuse config-provided strategy and action when no CLI overrides are given', () => {
    const result = resolveDedupeConfig(
      {
        enabled: true,
        recursive: true,
        strategy: { mode: DedupeMode.ALL, size: true },
        action: DedupeAction.SKIP
      },
      undefined,
      undefined
    );

    expect(result).toEqual({
      enabled: true,
      recursive: true,
      strategy: { mode: DedupeMode.ALL, size: true },
      action: DedupeAction.SKIP
    });
  });

  it('should build config overrides through the helper', () => {
    const result = createDedupeConfigOverrides({
      config: '/tmp/config.yml',
      action: DedupeAction.REPLACE,
      confirmReplace: false,
      dryRun: true,
      logLevel: 'debug'
    });

    expect(result).toEqual({
      config: '/tmp/config.yml',
      dedupe: true,
      dedupeAction: 'replace',
      dryRun: true,
      logLevel: 'debug'
    });
  });

  it('should normalize raw dedupe command options into typed command input', () => {
    const result = normalizeDedupeCommandOptions({
      action: 'replace',
      confirmReplace: undefined,
      dryRun: true,
      preset: 'media',
      reportJson: '/tmp/report.json'
    });

    expect(result).toEqual({
      action: DedupeAction.REPLACE,
      confirmReplace: false,
      dryRun: true,
      preset: DedupePreset.MEDIA,
      reportJson: '/tmp/report.json'
    });
  });

  it('should resolve the explicit preset through the helper', () => {
    const preset = resolvePreset('safe');

    expect(preset).toBe(DedupePreset.SAFE);
  });

  it('should return false from the delete gate for non-replace and dry-run cases', () => {
    expect(shouldDeleteDuplicates(DedupeAction.REPORT, {})).toBe(false);
    expect(shouldDeleteDuplicates(DedupeAction.REPLACE, { dryRun: true })).toBe(false);
  });

  it('should allow replace when confirmation safety is satisfied', () => {
    const result = validateReplaceSafety({
      dedupeConfig: {
        enabled: true,
        recursive: false,
        strategy: { mode: DedupeMode.ANY },
        action: DedupeAction.REPLACE
      },
      options: { confirmReplace: true, dryRun: false }
    });

    expect(result).toBeUndefined();
  });

  it('should build default report paths only for report actions', () => {
    expect(getDefaultReportPath(DedupeAction.REPORT, '/tmp/reports', 'x.json')).toBe(
      path.join('/tmp/reports', 'x.json')
    );
    expect(getDefaultReportPath(DedupeAction.SKIP, '/tmp/reports', 'x.json')).toBeUndefined();
  });

  it('should create report writes for json-only and markdown-only paths', async () => {
    const jsonOnly = createReportWrites(
      mockReportWriter,
      { jsonPath: '/tmp/report.json' },
      { groups: [], totalFiles: 0, totalDuplicates: 0, strategiesUsed: [] }
    );
    const markdownOnly = createReportWrites(
      mockReportWriter,
      { markdownPath: '/tmp/report.md' },
      { groups: [], totalFiles: 0, totalDuplicates: 0, strategiesUsed: [] }
    );

    await Promise.all([...jsonOnly, ...markdownOnly]);

    expect(mockReportWriter.write).toHaveBeenCalledWith(expect.anything(), '/tmp/report.json');
    expect(mockReportWriter.writeMarkdown).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp/report.md'
    );
  });

  it('should skip report writes when no report paths are resolved', async () => {
    await (handler as any).writeReportsIfRequested(
      {
        dedupeConfig: { action: DedupeAction.SKIP },
        options: {},
        targetDir: '/target'
      },
      { groups: [], totalFiles: 0, totalDuplicates: 0, strategiesUsed: [] }
    );

    expect(mockReportWriter.write).not.toHaveBeenCalled();
    expect(mockReportWriter.writeMarkdown).not.toHaveBeenCalled();
  });

  it('should use the default quarantine directory when none is provided to the private helper', () => {
    const destination = resolveQuarantinePath('/target/b.txt', '');

    expect(destination).toContain(path.join('.orderly', 'quarantine'));
  });
});
