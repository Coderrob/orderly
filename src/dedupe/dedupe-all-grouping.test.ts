import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { groupAllModeCandidates } from './dedupe-all-grouping';
import { DedupeMode } from './types';

describe('dedupe-all-grouping', () => {
  const files = [
    createScannedFile('/files/a.txt'),
    createScannedFile('/files/b.txt'),
    createScannedFile('/files/c.txt')
  ];

  it('should return empty groups for too few files or no strategy executions', () => {
    expect(groupAllModeCandidates(files.slice(0, 1), [])).toEqual([]);
    expect(groupAllModeCandidates(files, [])).toEqual([]);
  });

  it('should return empty groups when all applicable strategies do not match', () => {
    const result = groupAllModeCandidates(files, [
      createStrategyExecution('name', [
        ['/files/a.txt', 'shared'],
        ['/files/b.txt', 'shared'],
        ['/files/c.txt', 'unique']
      ]),
      createStrategyExecution('size', [
        ['/files/a.txt', '100'],
        ['/files/b.txt', '200'],
        ['/files/c.txt', '200']
      ])
    ]);

    expect(result).toEqual([]);
  });

  it('should create duplicate groups when all applicable strategies match', () => {
    const result = groupAllModeCandidates(files.slice(0, 2), [
      createStrategyExecution('name', [
        ['/files/a.txt', 'shared'],
        ['/files/b.txt', 'shared']
      ]),
      createStrategyExecution('size', [
        ['/files/a.txt', '100'],
        ['/files/b.txt', '100']
      ])
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual(files.slice(0, 2));
    expect(result[0].strategies).toEqual(expect.arrayContaining(['name', 'size']));
  });

  it('should treat missing strategy keys as not applicable in ALL mode', () => {
    const result = groupAllModeCandidates(files.slice(0, 2), [
      createStrategyExecution('name', [
        ['/files/a.txt', 'shared'],
        ['/files/b.txt', 'shared']
      ]),
      createStrategyExecution('image-dimensions', [['/files/a.txt', '1024x768']])
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual(files.slice(0, 2));
    expect(result[0].strategy).toBe('name');
  });

  it('should merge transitive ALL matches into one group', () => {
    const result = groupAllModeCandidates(files, [
      createStrategyExecution('name', [
        ['/files/b.txt', 'bc'],
        ['/files/c.txt', 'bc']
      ]),
      createStrategyExecution('size', [
        ['/files/a.txt', '10'],
        ['/files/b.txt', '10']
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
