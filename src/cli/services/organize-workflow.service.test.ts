import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { DEFAULT_CONFIG } from '../../config/types';
import { OrganizeWorkflow } from './organize-workflow.service';

jest.mock('../../dedupe/dedupe-factory', () => ({
  DedupeStrategyFactory: {
    createDedupeService: jest.fn()
  }
}));

describe('OrganizeWorkflow', () => {
  const fileOne = {
    originalPath: '/test/dir/file1.txt',
    filename: 'file1.txt',
    extension: '.txt',
    size: 10,
    needsRename: false
  };
  const fileTwo = {
    originalPath: '/test/dir/file2.txt',
    filename: 'file2.txt',
    extension: '.txt',
    size: 10,
    needsRename: false
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn()
  };
  const scanner = {
    scan: jest.fn()
  };
  const organizer = {
    planOperations: jest.fn(),
    executeOperations: jest.fn()
  };
  const manifestService = {
    saveManifests: jest.fn()
  };
  const cleaner = {
    clean: jest.fn()
  };

  let workflow: OrganizeWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    workflow = new OrganizeWorkflow(manifestService as any, cleaner as any);
    scanner.scan.mockResolvedValue([fileOne]);
    organizer.planOperations.mockReturnValue([{ type: 'move' }]);
    organizer.executeOperations.mockReturnValue({
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
    });
    cleaner.clean.mockReturnValue({
      scannedDirectories: 1,
      removedDirectories: 1,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });
  });

  it('should scan and organize files successfully', async () => {
    const result = await workflow.run(createCommandContext({ logger, organizer, scanner }), {});

    expect(result.successful).toBe(1);
    expect(scanner.scan).toHaveBeenCalledWith('/test/dir');
    expect(organizer.planOperations).toHaveBeenCalledWith([fileOne]);
  });

  it('should run post-organize cleanup when requested', async () => {
    await workflow.run(createCommandContext({ logger, organizer, scanner }), {
      cleanEmptyDirs: true
    });

    expect(cleaner.clean).toHaveBeenCalledWith(
      '/test/dir',
      expect.objectContaining({
        dryRun: false,
        includeHidden: false,
        removeOrderlyDir: false
      })
    );
  });

  it('should save manifests when requested', async () => {
    await workflow.run(createCommandContext({ logger, organizer, scanner }), { manifest: true });

    expect(manifestService.saveManifests).toHaveBeenCalled();
  });

  it('should keep all files when dedupe is disabled', async () => {
    await workflow.run(
      createCommandContext({
        logger,
        organizer,
        scanner,
        config: {
          dedupe: {
            enabled: false,
            recursive: false,
            strategy: { mode: 'any' },
            action: DedupeAction.SKIP
          }
        }
      }),
      {}
    );

    expect(organizer.planOperations).toHaveBeenCalledWith([fileOne]);
  });

  it('should filter skipped duplicates before planning operations', async () => {
    scanner.scan.mockResolvedValue([fileOne, fileTwo]);
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [{ files: [fileOne, fileTwo] }],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      }),
      applyAction: jest.fn().mockResolvedValue({
        skipped: [fileTwo],
        replaced: []
      })
    } as any);

    await workflow.run(
      createCommandContext({
        logger,
        organizer,
        scanner,
        config: {
          dedupe: {
            enabled: true,
            action: DedupeAction.SKIP
          }
        }
      }),
      { dedupe: true, dedupeAction: 'skip' }
    );

    expect(organizer.planOperations).toHaveBeenCalledWith([fileOne]);
  });

  it('should keep all files when dedupe finds no groups', async () => {
    jest.mocked(DedupeStrategyFactory.createDedupeService).mockReturnValue({
      findDuplicates: jest.fn().mockResolvedValue({
        groups: [],
        totalFiles: 1,
        totalDuplicates: 0,
        strategiesUsed: []
      }),
      applyAction: jest.fn()
    } as any);

    await workflow.run(
      createCommandContext({
        logger,
        organizer,
        scanner,
        config: {
          dedupe: {
            enabled: true,
            action: DedupeAction.REPORT
          }
        }
      }),
      { dedupe: true }
    );

    expect(organizer.planOperations).toHaveBeenCalledWith([fileOne]);
  });

  it('should log organization errors', async () => {
    organizer.executeOperations.mockReturnValue({
      operations: [{ type: 'move' }],
      successful: 1,
      failed: 1,
      skipped: 0,
      errors: [{ file: '/test/dir/file1.txt', error: 'denied' }]
    });

    await workflow.run(createCommandContext({ logger, organizer, scanner }), {});

    expect(logger.warn).toHaveBeenCalledWith('1 errors occurred during organization');
    expect(logger.warn).toHaveBeenCalledWith('  1. /test/dir/file1.txt: denied');
  });
});

function createCommandContext(params: {
  logger: { info: jest.Mock; warn: jest.Mock };
  organizer: { executeOperations: jest.Mock; planOperations: jest.Mock };
  scanner: { scan: jest.Mock };
  config?: Record<string, unknown>;
}): Parameters<OrganizeWorkflow['run']>[0] {
  return {
    config: {
      ...DEFAULT_CONFIG,
      dryRun: false,
      includeHidden: false,
      ...(params.config ?? {})
    },
    logger: params.logger,
    organizer: params.organizer,
    scanner: params.scanner,
    targetDir: '/test/dir'
  } as unknown as Parameters<OrganizeWorkflow['run']>[0];
}
