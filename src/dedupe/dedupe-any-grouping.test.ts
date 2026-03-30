import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { groupAnyModeCandidates } from './dedupe-any-grouping';

describe('dedupe-any-grouping', () => {
  const files = [
    createScannedFile('/files/a.txt'),
    createScannedFile('/files/b.txt'),
    createScannedFile('/files/c.txt')
  ];

  it('should return empty groups for too few files or no strategy executions', () => {
    expect(groupAnyModeCandidates(files.slice(0, 1), [])).toEqual([]);
    expect(groupAnyModeCandidates(files, [])).toEqual([]);
  });

  it('should return empty groups when no duplicate buckets are present', () => {
    const result = groupAnyModeCandidates(files, [
      createStrategyExecution('name', [
        ['/files/a.txt', 'a'],
        ['/files/b.txt', 'b'],
        ['/files/c.txt', 'c']
      ])
    ]);

    expect(result).toEqual([]);
  });

  it('should create duplicate groups from one duplicate bucket', () => {
    const result = groupAnyModeCandidates(files, [
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup'],
        ['/files/c.txt', 'unique']
      ])
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual([files[0], files[1]]);
    expect(result[0].strategy).toBe('name');
  });

  it('should merge overlapping duplicate buckets across strategies', () => {
    const result = groupAnyModeCandidates(files, [
      createStrategyExecution('name', [
        ['/files/a.txt', 'shared-name'],
        ['/files/b.txt', 'shared-name'],
        ['/files/c.txt', 'unique-name']
      ]),
      createStrategyExecution('size', [
        ['/files/a.txt', '100'],
        ['/files/b.txt', '200'],
        ['/files/c.txt', '200']
      ])
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual(files);
    expect(result[0].strategies).toEqual(expect.arrayContaining(['name', 'size']));
  });
});

function createScannedFile(originalPath: string): IScannedFile {
  const pathSegments = originalPath.split('/');
  const filename = pathSegments[pathSegments.length - 1] ?? 'file.txt';

  return {
    originalPath,
    filename,
    extension: '.txt',
    size: 1,
    needsRename: false
  };
}

function createStrategyExecution(
  strategy: string,
  entries: readonly (readonly [string, string])[]
): IStrategyExecution {
  return {
    strategy,
    keysByPath: new Map(entries)
  };
}
