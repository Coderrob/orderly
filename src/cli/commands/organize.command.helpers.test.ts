import * as path from 'node:path';

import { Logger } from '../../logger/logger';
import { Clock } from '../../utils/clock';
import { FileSystemUtils } from '../../utils/file-system-utils';
import {
  buildDedupeActionContext,
  handleReplacedDuplicates,
  handleSkippedDuplicates
} from './organize.command.helpers';

jest.mock('../../utils/clock', () => ({
  Clock: {
    nowMonotonicToken: jest.fn().mockReturnValue('token')
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

describe('organize.command.helpers', () => {
  const logger = {
    info: jest.fn()
  } as unknown as Logger;

  const fileA = {
    originalPath: '/target/a.txt',
    filename: 'a.txt',
    extension: '.txt',
    size: 10,
    needsRename: false
  };
  const fileB = {
    originalPath: '/target/b.txt',
    filename: 'b.txt',
    extension: '.txt',
    size: 10,
    needsRename: false
  };
  const fileC = {
    originalPath: '/target/c.txt',
    filename: 'c.txt',
    extension: '.txt',
    size: 10,
    needsRename: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(false);
  });

  it('should filter skipped and replaced files when building dedupe action context', () => {
    const context = buildDedupeActionContext({
      action: 'skip' as never,
      dedupeOutcome: { replaced: [fileC], skipped: [fileB] },
      dedupeResult: { groups: [{ files: [fileA, fileB, fileC] }], totalFiles: 3 } as never,
      files: [fileA, fileB, fileC],
      logger,
      options: { deleteDuplicates: false, quarantineDir: '/q' }
    });

    expect(context.filteredFiles).toEqual([fileA]);
    expect(context.deleteDuplicates).toBe(false);
    expect(context.quarantineDir).toBe('/q');
    expect(context.dedupeGroupCount).toBe(1);
  });

  it('should preserve the original file list when no duplicates are present', () => {
    const context = buildDedupeActionContext({
      action: 'report' as never,
      dedupeOutcome: { replaced: [], skipped: [] },
      dedupeResult: { groups: [], totalFiles: 1 } as never,
      files: [fileA],
      logger,
      options: { deleteDuplicates: false }
    });

    expect(context.filteredFiles).toEqual([fileA]);
    expect(context.filteredFiles).not.toBe(context.files);
  });

  it('should delete replaced duplicates when deletion is enabled', () => {
    const result = handleReplacedDuplicates([fileA], [fileB], { deleteDuplicates: true }, logger);

    expect(result).toEqual([fileA]);
    expect(FileSystemUtils.unlinkSync).toHaveBeenCalledWith('/target/b.txt');
    expect(logger.info).toHaveBeenCalledWith('Removed 1 duplicate files before organization');
  });

  it('should quarantine replaced duplicates when a quarantine directory is provided', () => {
    const result = handleReplacedDuplicates(
      [fileA],
      [fileB],
      { deleteDuplicates: true, quarantineDir: '/target/.orderly/quarantine' },
      logger
    );

    expect(result).toEqual([fileA]);
    expect(FileSystemUtils.mkdirSync).toHaveBeenCalled();
    expect(FileSystemUtils.renameSync).toHaveBeenCalledWith(
      '/target/b.txt',
      path.join('/target/.orderly/quarantine', 'b.txt')
    );
    expect(logger.info).toHaveBeenCalledWith('Quarantined 1 duplicate files before organization');
  });

  it('should create a unique quarantine filename when the destination already exists', () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(true);

    handleReplacedDuplicates(
      [fileA],
      [fileB],
      { deleteDuplicates: true, quarantineDir: '/target/.orderly/quarantine' },
      logger
    );

    expect(Clock.nowMonotonicToken).toHaveBeenCalled();
    expect(FileSystemUtils.renameSync).toHaveBeenCalledWith(
      '/target/b.txt',
      path.join('/target/.orderly/quarantine', 'token-b.txt')
    );
  });

  it('should only log planned removals during dry-run replacement handling', () => {
    const result = handleReplacedDuplicates([fileA], [fileB], { deleteDuplicates: false }, logger);

    expect(result).toEqual([fileA]);
    expect(FileSystemUtils.unlinkSync).not.toHaveBeenCalled();
    expect(FileSystemUtils.renameSync).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Would remove 1 duplicate files before organization');
  });

  it('should log skipped duplicate handling', () => {
    const result = handleSkippedDuplicates([fileA], 2, 3, logger);

    expect(result).toEqual([fileA]);
    expect(logger.info).toHaveBeenCalledWith(
      'Kept 2 primary files, filtered out 3 duplicate files'
    );
  });
});
