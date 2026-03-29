import type { IStrategyExecution } from './dedupe-analysis.helpers';
import {
  createCandidatePairs,
  createDuplicateCandidateBuckets
} from './dedupe-candidate-pairs';

describe('dedupe-candidate-pairs', () => {
  it('should return empty when no strategy bucket has duplicates', () => {
    const result = createCandidatePairs([
      createStrategyExecution('name', [
        ['/files/a.txt', 'a'],
        ['/files/b.txt', 'b']
      ])
    ]);

    expect(result).toEqual([]);
  });

  it('should create all unique path pairs within one bucket', () => {
    const result = createCandidatePairs([
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup'],
        ['/files/c.txt', 'dup']
      ])
    ]);

    expect(result).toEqual([
      { leftPath: '/files/a.txt', rightPath: '/files/b.txt' },
      { leftPath: '/files/a.txt', rightPath: '/files/c.txt' },
      { leftPath: '/files/b.txt', rightPath: '/files/c.txt' }
    ]);
  });

  it('should deduplicate repeated candidate pairs across strategies', () => {
    const result = createCandidatePairs([
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup']
      ]),
      createStrategyExecution('size', [
        ['/files/b.txt', '100'],
        ['/files/a.txt', '100']
      ])
    ]);

    expect(result).toEqual([{ leftPath: '/files/a.txt', rightPath: '/files/b.txt' }]);
  });

  it('should create duplicate candidate buckets with strategy metadata', () => {
    const result = createDuplicateCandidateBuckets([
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup'],
        ['/files/c.txt', 'unique']
      ])
    ]);

    expect(result).toEqual([
      {
        strategy: 'name',
        key: 'dup',
        paths: ['/files/a.txt', '/files/b.txt']
      }
    ]);
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
