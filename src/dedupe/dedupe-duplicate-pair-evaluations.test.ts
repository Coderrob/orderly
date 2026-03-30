import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { createDuplicatePairEvaluations } from './dedupe-duplicate-pair-evaluations';
import { DedupeMode } from './types';

describe('dedupe-duplicate-pair-evaluations', () => {
  const files = [
    createScannedFile('/files/a.txt'),
    createScannedFile('/files/b.txt'),
    createScannedFile('/files/c.txt')
  ];

  it('should create duplicate pair evaluations in ANY mode from matched buckets', () => {
    const result = createDuplicatePairEvaluations(
      files,
      [
        createStrategyExecution('name', [
          ['/files/a.txt', 'dup'],
          ['/files/b.txt', 'dup'],
          ['/files/c.txt', 'unique']
        ])
      ],
      DedupeMode.ANY
    );

    expect(result).toEqual([
      {
        leftIndex: 0,
        rightIndex: 1,
        matched: [{ strategy: 'name', key: 'dup' }]
      }
    ]);
  });

  it('should return no duplicate pair evaluations when ALL mode does not fully match', () => {
    const result = createDuplicatePairEvaluations(
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
