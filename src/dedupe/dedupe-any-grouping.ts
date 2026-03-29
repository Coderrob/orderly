import type { IScannedFile } from '../scanner/interfaces';

import {
  createGroupIndexPairs,
  createInitialParents,
  createPairId,
  type IStrategyExecution,
  type IStrategyMatch
} from './dedupe-analysis.helpers';
import {
  createDuplicateCandidateBuckets,
  type IDuplicateCandidateBucket
} from './dedupe-candidate-pairs';
import { buildGroupsFromParents, unionParents } from './dedupe-grouping';
import { createFileIndexesByPath } from './dedupe-pair-evaluation';
import type { IDuplicateGroup } from './types';

const MIN_DUPLICATE_GROUP_SIZE = 2;

/**
 * Adds strategy matches for every pair inside one duplicate bucket.
 * @param bucket - Duplicate candidate bucket.
 * @param indexes - File indexes present in the bucket.
 * @param pairMatches - Pair-match accumulator keyed by index pair id.
 * @returns Updated pair-match accumulator.
 */
function appendBucketPairMatches(
  bucket: Readonly<IDuplicateCandidateBucket>,
  indexes: readonly number[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>
): ReadonlyMap<string, readonly IStrategyMatch[]> {
  const nextPairMatches = new Map(pairMatches);

  for (const pair of createGroupIndexPairs(indexes)) {
    const pairId = createPairId(pair.leftIndex, pair.rightIndex);
    const existingMatches = nextPairMatches.get(pairId) ?? [];
    nextPairMatches.set(pairId, [
      ...existingMatches,
      { strategy: bucket.strategy, key: bucket.key }
    ]);
  }

  return nextPairMatches;
}

/**
 * Creates file indexes for one duplicate bucket.
 * @param bucket - Duplicate candidate bucket.
 * @param fileIndexesByPath - File-index lookup keyed by original path.
 * @returns File indexes present in the bucket.
 */
function createBucketIndexes(
  bucket: Readonly<IDuplicateCandidateBucket>,
  fileIndexesByPath: Readonly<ReadonlyMap<string, number>>
): readonly number[] {
  return bucket.paths.map(createFileIndexSelector(fileIndexesByPath)).filter(isFileIndex);
}

/**
 * Creates a file-index selector for bucket path resolution.
 * @param fileIndexesByPath - File-index lookup keyed by original path.
 * @returns File-index selector.
 */
function createFileIndexSelector(
  fileIndexesByPath: Readonly<ReadonlyMap<string, number>>
): (path: string) => number | undefined {
  /**
   * Selects one file index by original path.
   * @param path - Original file path.
   * @returns Matching file index or undefined.
   */
  function selectFileIndex(path: string): number | undefined {
    return fileIndexesByPath.get(path);
  }

  return selectFileIndex;
}

/**
 * Creates duplicate groups for `ANY` mode directly from matched strategy buckets.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Duplicate groups with multiple files per group.
 */
export function groupAnyModeCandidates(
  files: readonly IScannedFile[],
  strategyExecutions: readonly IStrategyExecution[]
): IDuplicateGroup[] {
  const fileIndexesByPath = createFileIndexesByPath(files);
  let parents = createInitialParents(files.length);
  let pairMatches: ReadonlyMap<string, readonly IStrategyMatch[]> = new Map();

  for (const bucket of createDuplicateCandidateBuckets(strategyExecutions)) {
    const indexes = createBucketIndexes(bucket, fileIndexesByPath);
    if (indexes.length < MIN_DUPLICATE_GROUP_SIZE) {
      continue;
    }

    parents = unionBucketIndexes(indexes, parents);
    pairMatches = appendBucketPairMatches(bucket, indexes, pairMatches);
  }

  return buildGroupsFromParents(files, parents, pairMatches);
}

/**
 * Returns whether an optional file index is present.
 * @param index - Optional file index.
 * @returns True when the index is defined.
 */
function isFileIndex(index: number | undefined): index is number {
  return index !== undefined;
}

/**
 * Unions all indexes participating in one duplicate bucket.
 * @param indexes - File indexes present in the bucket.
 * @param parents - Existing parent pointers.
 * @returns Updated parent pointers.
 */
function unionBucketIndexes(indexes: readonly number[], parents: readonly number[]): readonly number[] {
  let nextParents = parents;

  for (let index = 1; index < indexes.length; index++) {
    nextParents = unionParents(nextParents, indexes[0], indexes[index]);
  }

  return nextParents;
}
