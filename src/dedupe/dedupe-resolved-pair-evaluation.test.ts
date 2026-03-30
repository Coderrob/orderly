import type { IStrategyExecution } from './dedupe-analysis.helpers';
import {
  resolvePathPairIndexes,
  toDuplicatePairEvaluation
} from './dedupe-resolved-pair-evaluation';
import { DedupeMode } from './types';

describe('dedupe-resolved-pair-evaluation', () => {
  const fileIndexesByPath = new Map([
    ['/files/a.txt', 0],
    ['/files/b.txt', 1]
  ]);

  it('should resolve known path pairs into file indexes', () => {
    const result = resolvePathPairIndexes(fileIndexesByPath, {
      leftPath: '/files/a.txt',
      rightPath: '/files/b.txt',
      matched: [{ strategy: 'name', key: 'dup' }]
    });

    expect(result).toEqual({ leftIndex: 0, rightIndex: 1 });
  });

  it('should return null when a matched path pair cannot be resolved', () => {
    const result = resolvePathPairIndexes(fileIndexesByPath, {
      leftPath: '/files/a.txt',
      rightPath: '/files/missing.txt',
      matched: [{ strategy: 'name', key: 'dup' }]
    });

    expect(result).toBeNull();
  });

  it('should create duplicate pair evaluations when the mode passes', () => {
    const result = toDuplicatePairEvaluation(
      fileIndexesByPath,
      [
        createStrategyExecution('name', [
          ['/files/a.txt', 'dup'],
          ['/files/b.txt', 'dup']
        ])
      ],
      DedupeMode.ANY
    )({
      leftPath: '/files/a.txt',
      rightPath: '/files/b.txt',
      matched: [{ strategy: 'name', key: 'dup' }]
    });

    expect(result).toEqual({
      leftIndex: 0,
      rightIndex: 1,
      matched: [{ strategy: 'name', key: 'dup' }]
    });
  });

  it('should return null when the mode fails', () => {
    const result = toDuplicatePairEvaluation(
      fileIndexesByPath,
      [
        createStrategyExecution('name', [
          ['/files/a.txt', 'dup'],
          ['/files/b.txt', 'dup']
        ]),
        createStrategyExecution('size', [
          ['/files/a.txt', '100'],
          ['/files/b.txt', '200']
        ])
      ],
      DedupeMode.ALL
    )({
      leftPath: '/files/a.txt',
      rightPath: '/files/b.txt',
      matched: [{ strategy: 'name', key: 'dup' }]
    });

    expect(result).toBeNull();
  });
});

function createStrategyExecution(
  strategy: string,
  entries: readonly (readonly [string, string])[]
): IStrategyExecution {
  return {
    strategy,
    keysByPath: new Map(entries)
  };
}
