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

  it('should return empty groups when all applicable strategies do not match', () => {
    const result = groupAllModeCandidates(
      files,
      [
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
      ],
      DedupeMode.ALL
    );

    expect(result).toEqual([]);
  });

  it('should create duplicate groups when all applicable strategies match', () => {
    const result = groupAllModeCandidates(
      files.slice(0, 2),
      [
        createStrategyExecution('name', [
          ['/files/a.txt', 'shared'],
          ['/files/b.txt', 'shared']
        ]),
        createStrategyExecution('size', [
          ['/files/a.txt', '100'],
          ['/files/b.txt', '100']
        ])
      ],
      DedupeMode.ALL
    );

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual(files.slice(0, 2));
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
