import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { createDuplicatePairEvaluations } from './dedupe-duplicate-pair-evaluations';
import { groupCandidates } from './dedupe-group-resolution';
import { DedupeMode } from './types';

describe('dedupe-group-resolution', () => {
  const files = [
    createScannedFile('/files/a.txt'),
    createScannedFile('/files/b.txt'),
    createScannedFile('/files/c.txt')
  ];

  it('should return empty groups for too few files or no strategy executions', () => {
    expect(groupCandidates(files.slice(0, 1), [], DedupeMode.ANY)).toEqual([]);
    expect(groupCandidates(files, [], DedupeMode.ANY)).toEqual([]);
  });

  it('should create duplicate pair evaluations from strategy executions', () => {
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

  it('should require all applicable strategies when creating duplicate pair evaluations in ALL mode', () => {
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

  it('should build duplicate groups from strategy executions', () => {
    const result = groupCandidates(
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

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual([files[0], files[1]]);
    expect(result[0].strategy).toBe('name');
  });

  it('should merge overlapping duplicate buckets in ANY mode', () => {
    const result = groupCandidates(
      files,
      [
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
      ],
      DedupeMode.ANY
    );

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual(files);
    expect(result[0].strategies).toEqual(expect.arrayContaining(['name', 'size']));
  });

  it('should keep ALL mode on exact pair agreement', () => {
    const result = groupCandidates(
      files,
      [
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
