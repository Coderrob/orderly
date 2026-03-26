import type { IScannedFile } from '../scanner/interfaces';

import {
  appendIndexToRoot,
  buildDedupeResult,
  buildDuplicateGroup,
  buildReplaceActionOutcome,
  buildReportActionOutcome,
  buildSkipActionOutcome,
  buildStrategyExecution,
  createGroupIndexPairs,
  createIndexPairs,
  createInitialParents,
  getGroupFiles,
  getSecondaryFiles,
  getSuccessfulCandidates,
  getSuccessfulExecutions,
  getSupportedFiles,
  replaceParent
} from './dedupe-service.helpers';
import { DedupeAction } from './types';

describe('dedupe-service.helpers', () => {
  const fileA = createScannedFile('/files/a.txt');
  const fileB = createScannedFile('/files/b.txt');
  const fileC = createScannedFile('/files/c.txt');

  it('should append indexes to an existing grouped root', () => {
    const result = appendIndexToRoot([{ root: 1, indexes: [1] }], 1, 3);

    expect(result).toEqual([{ root: 1, indexes: [1, 3] }]);
  });

  it('should create a new grouped root when one does not exist', () => {
    const result = appendIndexToRoot([], 2, 5);

    expect(result).toEqual([{ root: 2, indexes: [5] }]);
  });

  it('should build a dedupe result with sorted strategy names and duplicate totals', () => {
    const groups = [
      { key: 'a', strategy: 'name', files: [fileA, fileB], primary: fileA },
      { key: 'b', strategy: 'size', files: [fileC], primary: fileC }
    ];

    const result = buildDedupeResult(3, groups as any, [
      { strategy: 'size', keysByPath: new Map() },
      { strategy: 'name', keysByPath: new Map() },
      { strategy: 'name', keysByPath: new Map() }
    ]);

    expect(result.totalFiles).toBe(3);
    expect(result.totalDuplicates).toBe(3);
    expect(result.strategiesUsed).toEqual(['name', 'name', 'size']);
  });

  it('should build a duplicate group with fallback key when no match metadata exists', () => {
    const result = buildDuplicateGroup([fileA, fileB], []);

    expect(result.key).toBe(fileA.originalPath);
    expect(result.strategy).toBe('');
    expect(result.primary).toBe(fileA);
  });

  it('should build a duplicate group with unique strategies', () => {
    const result = buildDuplicateGroup(
      [fileA, fileB],
      [
        { strategy: 'size', key: 'same-size' },
        { strategy: 'size', key: 'same-size' },
        { strategy: 'name', key: 'same-name' }
      ]
    );

    expect(result.key).toBe('same-size');
    expect(result.strategy).toBe('size,name');
    expect(result.strategies).toEqual(['size', 'name']);
  });

  it('should build replace, report, and skip outcomes', () => {
    const dedupeResult = {
      groups: [{ key: 'dup', strategy: 'name', files: [fileA, fileB], primary: fileA }],
      totalFiles: 2,
      totalDuplicates: 2,
      strategiesUsed: ['name']
    };

    expect(buildReplaceActionOutcome(dedupeResult).action).toBe(DedupeAction.REPLACE);
    expect(buildReplaceActionOutcome(dedupeResult).replaced).toEqual([fileB]);
    expect(buildReportActionOutcome(dedupeResult).action).toBe(DedupeAction.REPORT);
    expect(buildReportActionOutcome(dedupeResult).reported).toEqual(dedupeResult.groups);
    expect(buildSkipActionOutcome(dedupeResult).action).toBe(DedupeAction.SKIP);
    expect(buildSkipActionOutcome(dedupeResult).skipped).toEqual([fileB]);
  });

  it('should build strategy execution maps from candidates', () => {
    const result = buildStrategyExecution('name', [
      { strategy: 'name', key: 'a', file: fileA },
      { strategy: 'name', key: 'b', file: fileB }
    ]);

    expect(result.strategy).toBe('name');
    expect(result.keysByPath.get('/files/a.txt')).toBe('a');
    expect(result.keysByPath.get('/files/b.txt')).toBe('b');
  });

  it('should create group index pairs for duplicate groups', () => {
    expect(createGroupIndexPairs([4])).toEqual([]);
    expect(createGroupIndexPairs([4, 7, 9])).toEqual([
      { leftIndex: 4, rightIndex: 7 },
      { leftIndex: 4, rightIndex: 9 },
      { leftIndex: 7, rightIndex: 9 }
    ]);
  });

  it('should create all unique index pairs for a file count', () => {
    expect(createIndexPairs(1)).toEqual([]);
    expect(createIndexPairs(3)).toEqual([
      { leftIndex: 0, rightIndex: 1 },
      { leftIndex: 0, rightIndex: 2 },
      { leftIndex: 1, rightIndex: 2 }
    ]);
  });

  it('should create initial parent pointers', () => {
    expect(createInitialParents(0)).toEqual([]);
    expect(createInitialParents(4)).toEqual([0, 1, 2, 3]);
  });

  it('should resolve group files recursively', () => {
    expect(getGroupFiles([fileA, fileB, fileC], [])).toEqual([]);
    expect(getGroupFiles([fileA, fileB, fileC], [0, 2])).toEqual([fileA, fileC]);
  });

  it('should resolve secondary files recursively', () => {
    expect(getSecondaryFiles([])).toEqual([]);
    expect(
      getSecondaryFiles([
        { key: 'dup-1', strategy: 'name', files: [fileA, fileB], primary: fileA },
        { key: 'dup-2', strategy: 'size', files: [fileC], primary: fileC }
      ] as any)
    ).toEqual([fileB]);
  });

  it('should filter null candidates and executions', () => {
    expect(getSuccessfulCandidates([{ strategy: 'name', key: 'a', file: fileA }, null])).toEqual([
      { strategy: 'name', key: 'a', file: fileA }
    ]);
    expect(getSuccessfulExecutions([{ strategy: 'name', keysByPath: new Map() }, null])).toEqual([
      { strategy: 'name', keysByPath: new Map() }
    ]);
  });

  it('should filter supported files recursively', () => {
    const strategy = {
      canProcess: jest.fn(
        (file: Readonly<IScannedFile>) => file.originalPath !== fileB.originalPath
      )
    };

    expect(getSupportedFiles(strategy as any, [])).toEqual([]);
    expect(getSupportedFiles(strategy as any, [fileA, fileB, fileC])).toEqual([fileA, fileC]);
  });

  it('should replace one parent pointer immutably', () => {
    const parents = [0, 1, 2];

    expect(replaceParent(parents, 1, 0)).toEqual([0, 0, 2]);
    expect(parents).toEqual([0, 1, 2]);
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
