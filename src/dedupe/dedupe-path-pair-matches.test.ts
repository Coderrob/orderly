import type { IStrategyExecution } from './dedupe-analysis.helpers';
import {
  countApplicableStrategies,
  createMatchedPathPairMap,
  shouldCreateDuplicatePairEvaluation
} from './dedupe-path-pair-matches';
import { DedupeMode } from './types';

describe('dedupe-path-pair-matches', () => {
  it('should create matched path-pair entries from duplicate buckets', () => {
    const result = createMatchedPathPairMap([
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup'],
        ['/files/c.txt', 'unique']
      ])
    ]);

    expect([...result.values()]).toEqual([
      {
        leftPath: '/files/a.txt',
        rightPath: '/files/b.txt',
        matched: [{ strategy: 'name', key: 'dup' }]
      }
    ]);
  });

  it('should merge matched strategies for repeated path pairs', () => {
    const result = createMatchedPathPairMap([
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup']
      ]),
      createStrategyExecution('size', [
        ['/files/a.txt', '100'],
        ['/files/b.txt', '100']
      ])
    ]);

    expect([...result.values()]).toEqual([
      {
        leftPath: '/files/a.txt',
        rightPath: '/files/b.txt',
        matched: [
          { strategy: 'name', key: 'dup' },
          { strategy: 'size', key: '100' }
        ]
      }
    ]);
  });

  it('should count applicable strategies only when both files have keys', () => {
    const result = countApplicableStrategies('/files/a.txt', '/files/b.txt', [
      createStrategyExecution('name', [
        ['/files/a.txt', 'dup'],
        ['/files/b.txt', 'dup']
      ]),
      createStrategyExecution('size', [['/files/a.txt', '100']])
    ]);

    expect(result).toBe(1);
  });

  it('should evaluate matched path pairs in ALL mode using applicable strategy count', () => {
    const result = shouldCreateDuplicatePairEvaluation(
      {
        leftPath: '/files/a.txt',
        rightPath: '/files/b.txt',
        matched: [{ strategy: 'name', key: 'dup' }]
      },
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
    );

    expect(result).toBe(false);
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
