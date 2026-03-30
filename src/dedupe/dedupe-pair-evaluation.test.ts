import { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import {
  createDuplicatePairEvaluation,
  createFileIndexesByPath,
  findPairMatches,
  isDuplicatePair,
  isDuplicatePairEvaluation,
  toFileIndexEntry,
  toIndexPair
} from './dedupe-pair-evaluation';
import { DedupeMode } from './types';

describe('dedupe-pair-evaluation', () => {
  const files = [createScannedFile('/path/file1.txt'), createScannedFile('/path/file2.txt')];

  it('should create file-index lookup entries', () => {
    expect(toFileIndexEntry(files[0], 0)).toEqual(['/path/file1.txt', 0]);
  });

  it('should create a file-index lookup map', () => {
    const result = createFileIndexesByPath(files);

    expect(result.get('/path/file1.txt')).toBe(0);
    expect(result.get('/path/file2.txt')).toBe(1);
  });

  it('should convert a known path pair into index pairs', () => {
    const result = toIndexPair(
      { leftPath: '/path/file1.txt', rightPath: '/path/file2.txt' },
      createFileIndexesByPath(files)
    );

    expect(result).toEqual({ leftIndex: 0, rightIndex: 1 });
  });

  it('should return null when a path pair cannot be resolved', () => {
    const result = toIndexPair(
      { leftPath: '/path/file1.txt', rightPath: '/missing.txt' },
      createFileIndexesByPath(files)
    );

    expect(result).toBeNull();
  });

  it('should find pair matches only when both files have keys', () => {
    const result = findPairMatches('/left', '/right', [
      {
        strategy: 'name',
        keysByPath: new Map([['/left', 'same']])
      }
    ]);

    expect(result).toEqual({ applicableStrategies: 0, matched: [] });
  });

  it('should treat ANY mode as duplicate when at least one strategy matches', () => {
    expect(isDuplicatePair([{ strategy: 'name', key: 'same' }], 2, DedupeMode.ANY)).toBe(true);
    expect(isDuplicatePair([], 2, DedupeMode.ANY)).toBe(false);
  });

  it('should require all applicable strategies to match in ALL mode', () => {
    expect(isDuplicatePair([{ strategy: 'name', key: 'same' }], 2, DedupeMode.ALL)).toBe(false);
    expect(
      isDuplicatePair(
        [
          { strategy: 'name', key: 'same' },
          { strategy: 'size', key: 'same' }
        ],
        2,
        DedupeMode.ALL
      )
    ).toBe(true);
  });

  it('should create duplicate pair evaluations when the configured mode passes', () => {
    const result = createDuplicatePairEvaluation(
      files,
      { leftIndex: 0, rightIndex: 1 },
      [
        createStrategyExecution('name', [
          ['/path/file1.txt', 'same'],
          ['/path/file2.txt', 'same']
        ])
      ],
      DedupeMode.ANY
    );

    expect(result).toEqual({
      leftIndex: 0,
      rightIndex: 1,
      matched: [{ strategy: 'name', key: 'same' }]
    });
  });

  it('should return null when a pair does not satisfy the configured mode', () => {
    const result = createDuplicatePairEvaluation(
      files,
      { leftIndex: 0, rightIndex: 1 },
      [
        createStrategyExecution('name', [
          ['/path/file1.txt', 'same'],
          ['/path/file2.txt', 'same']
        ]),
        createStrategyExecution('size', [
          ['/path/file1.txt', '100'],
          ['/path/file2.txt', '200']
        ])
      ],
      DedupeMode.ALL
    );

    expect(result).toBeNull();
  });

  it('should identify present duplicate-pair evaluations', () => {
    expect(isDuplicatePairEvaluation(null)).toBe(false);
    expect(
      isDuplicatePairEvaluation({
        leftIndex: 0,
        rightIndex: 1,
        matched: []
      })
    ).toBe(true);
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
