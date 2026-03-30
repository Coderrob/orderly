import * as path from 'node:path';

import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { FileSystemUtils } from '../../utils/file-system-utils';
import { DedupeWorkflow } from './dedupe-workflow.service';

jest.mock('../../dedupe/dedupe-factory', () => ({
  DedupeStrategyFactory: {
    createDedupeService: jest.fn()
  }
}));

jest.mock('../../utils/file-system-utils', () => ({
  FileSystemUtils: {
    hasPath: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    renameSync: jest.fn(),
    unlinkSync: jest.fn()
  }
}));

describe('DedupeWorkflow', () => {
  const scanner = {
    scan: jest.fn()
  };
  const reportWriter = {
    write: jest.fn().mockResolvedValue(undefined),
    writeMarkdown: jest.fn().mockResolvedValue(undefined)
  };

  let workflow: DedupeWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    workflow = new DedupeWorkflow(reportWriter as any);
    scanner.scan.mockResolvedValue([
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
    ]);
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
    const workflowResult = await workflow.run(
      createCommandContext({
        scanner,
        dedupeConfig: { action: DedupeAction.REPORT },
        options: {}
      })
    );

    expect(workflowResult.deleteErrors).toEqual([]);
    expect(reportWriter.write).toHaveBeenCalled();
    expect(reportWriter.writeMarkdown).toHaveBeenCalled();
  });

  it('should delete duplicates for replace action when confirmed', async () => {
    const workflowResult = await workflow.run(
      createCommandContext({
        scanner,
        dedupeConfig: { action: DedupeAction.REPLACE },
        options: { confirmReplace: true }
      })
    );

    expect(workflowResult.deleteErrors).toEqual([]);
    expect(FileSystemUtils.unlinkSync).toHaveBeenCalledWith('/target/b.txt');
  });

  it('should skip deletions for replace action during dry-run execution', async () => {
    await workflow.run(
      createCommandContext({
        scanner,
        dedupeConfig: { action: DedupeAction.REPLACE },
        options: { dryRun: true }
      })
    );

    expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
  });

  it('should quarantine duplicates when quarantine directory is provided', async () => {
    await workflow.run(
      createCommandContext({
        scanner,
        dedupeConfig: { action: DedupeAction.REPLACE },
        options: { quarantineDir: '/target/.orderly/quarantine' }
      })
    );

    expect(FileSystemUtils.renameSync).toHaveBeenCalledWith(
      '/target/b.txt',
      path.resolve('/target/.orderly/quarantine', 'b.txt')
    );
  });

  it('should surface delete errors', async () => {
    jest.mocked(FileSystemUtils.unlinkSync).mockImplementation(() => {
      throw new Error('unlink failed');
    });

    const workflowResult = await workflow.run(
      createCommandContext({
        scanner,
        dedupeConfig: { action: DedupeAction.REPLACE },
        options: { confirmReplace: true }
      })
    );

    expect(workflowResult.deleteErrors).toEqual(['/target/b.txt: unlink failed']);
  });

  it('should skip report writes when no report paths are resolved', async () => {
    await workflow.run(
      createCommandContext({
        scanner,
        dedupeConfig: { action: DedupeAction.SKIP },
        options: {}
      })
    );

    expect(reportWriter.write).not.toHaveBeenCalled();
    expect(reportWriter.writeMarkdown).not.toHaveBeenCalled();
  });
});

function createCommandContext(params: {
  dedupeConfig: { action: DedupeAction };
  options: Record<string, unknown>;
  scanner: { scan: jest.Mock };
}): Parameters<DedupeWorkflow['run']>[0] {
  return {
    dedupeConfig: {
      enabled: true,
      recursive: false,
      strategy: { mode: 'any' },
      ...params.dedupeConfig
    },
    options: {
      confirmReplace: false,
      ...params.options
    },
    scanner: params.scanner,
    targetDir: '/target'
  } as unknown as Parameters<DedupeWorkflow['run']>[0];
}
