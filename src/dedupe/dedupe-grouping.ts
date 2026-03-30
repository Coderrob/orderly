import type { IScannedFile } from '../scanner/interfaces';

import {
  appendIndexToRoot,
  buildDuplicateGroup,
  createGroupIndexPairs,
  createInitialParents,
  createPairId,
  getGroupFiles,
  replaceParent,
  type IStrategyMatch
} from './dedupe-analysis.helpers';
import type { IDuplicateGroup } from './types';

const MIN_DUPLICATE_GROUP_SIZE = 2;

/**
 * Builds duplicate groups from the connected duplicate pairs.
 * @param files - Files being analyzed for duplicates.
 * @param parents - Disjoint-set parent indices for each file.
 * @param pairMatches - Matching strategies for each duplicate pair.
 * @returns Array of duplicate groups.
 */
function buildGroups(
  files: readonly IScannedFile[],
  parents: readonly number[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>
): IDuplicateGroup[] {
  const groupedIndexes = groupIndexesByRoot(files.length, parents);
  return createDuplicateGroups(files, groupedIndexes, pairMatches);
}

/**
 * Builds duplicate groups from evaluated duplicate pairs.
 * @param files - Files being analyzed for duplicates.
 * @param pairEvaluations - Duplicate pair evaluations.
 * @returns Duplicate groups.
 */
export function buildGroupsFromPairEvaluations(
  files: readonly IScannedFile[],
  pairEvaluations: readonly Readonly<{
    leftIndex: number;
    matched: readonly IStrategyMatch[];
    rightIndex: number;
  }>[]
): IDuplicateGroup[] {
  const parents = createParentsFromPairs(files.length, pairEvaluations);
  return buildGroups(files, parents, createPairMatchMap(pairEvaluations));
}

/**
 * Builds duplicate groups from already-resolved parents and pair matches.
 * @param files - Files being analyzed for duplicates.
 * @param parents - Disjoint-set parent indices for each file.
 * @param pairMatches - Matching strategies for each duplicate pair.
 * @returns Duplicate groups.
 */
export function buildGroupsFromParents(
  files: readonly IScannedFile[],
  parents: readonly number[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>
): IDuplicateGroup[] {
  return buildGroups(files, parents, pairMatches);
}

/**
 * Collects all matching strategies contributing to a duplicate group.
 * @param indexes - File indexes in the duplicate group.
 * @param pairMatches - Matching strategies for each duplicate pair.
 * @returns Strategy match metadata for the group.
 */
function collectGroupMatches(
  indexes: readonly number[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>
): readonly IStrategyMatch[] {
  let matches: readonly IStrategyMatch[] = [];

  for (const pair of createGroupIndexPairs(indexes)) {
    const pairMatch = pairMatches.get(createPairId(pair.leftIndex, pair.rightIndex));
    if (pairMatch) {
      matches = [...matches, ...pairMatch];
    }
  }

  return matches;
}

/**
 * Creates one duplicate group when enough files are present.
 * @param files - Files being analyzed for duplicates.
 * @param indexes - File indexes in the duplicate group.
 * @param pairMatches - Matching strategies for each duplicate pair.
 * @returns Duplicate group or null when fewer than two files are present.
 */
function createDuplicateGroup(
  files: readonly IScannedFile[],
  indexes: readonly number[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>
): IDuplicateGroup | null {
  if (indexes.length < MIN_DUPLICATE_GROUP_SIZE) {
    return null;
  }

  const groupFiles = getGroupFiles(files, indexes);
  const matchMetadata = collectGroupMatches(indexes, pairMatches);
  return buildDuplicateGroup(groupFiles, matchMetadata);
}

/**
 * Creates one duplicate group from grouped root indexes.
 * @param files - Files being analyzed for duplicates.
 * @param pairMatches - Matching strategies for each duplicate pair.
 * @param groupedRoot - File indexes grouped by duplicate root.
 * @returns Duplicate group or null when too small.
 */
function createDuplicateGroupFromRoot(
  files: readonly IScannedFile[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>,
  groupedRoot: Readonly<{ indexes: readonly number[]; root: number }>
): IDuplicateGroup | null {
  return createDuplicateGroup(files, groupedRoot.indexes, pairMatches);
}

/**
 * Creates duplicate groups from grouped indexes.
 * @param files - Files being analyzed for duplicates.
 * @param groupedIndexes - File indexes grouped by duplicate root.
 * @param pairMatches - Matching strategies for each duplicate pair.
 * @returns Duplicate groups.
 */
function createDuplicateGroups(
  files: readonly IScannedFile[],
  groupedIndexes: readonly Readonly<{ indexes: readonly number[]; root: number }>[],
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>
): IDuplicateGroup[] {
  return groupedIndexes
    .map(createDuplicateGroupFromRoot.bind(undefined, files, pairMatches))
    .filter(isDuplicateGroup);
}

/**
 * Creates pair-match lookup data for evaluated duplicate pairs.
 * @param pairEvaluations - Duplicate pair evaluations.
 * @returns Pair-match lookup map.
 */
function createPairMatchMap(
  pairEvaluations: readonly Readonly<{
    leftIndex: number;
    matched: readonly IStrategyMatch[];
    rightIndex: number;
  }>[]
): Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>> {
  return new Map(pairEvaluations.map(toPairMatchEntry));
}

/**
 * Creates parent pointers by unioning all duplicate file pairs.
 * @param fileCount - Number of files in the scan set.
 * @param pairEvaluations - Duplicate pair evaluations.
 * @returns Parent pointers for disjoint duplicate sets.
 */
function createParentsFromPairs(
  fileCount: number,
  pairEvaluations: readonly Readonly<{
    leftIndex: number;
    rightIndex: number;
  }>[]
): readonly number[] {
  let parents = createInitialParents(fileCount);

  for (const pair of pairEvaluations) {
    parents = unionParents(parents, pair.leftIndex, pair.rightIndex);
  }

  return parents;
}

/**
 * Finds the representative index for the disjoint-set structure.
 * @param parents - Parent pointers for each file index.
 * @param index - Index to resolve.
 * @returns Representative index for the set.
 */
function findParent(parents: readonly number[], index: number): number {
  return parents[index] === index ? index : findParent(parents, parents[index]);
}

/**
 * Groups file indexes by their resolved duplicate root.
 * @param fileCount - Number of files in the scan set.
 * @param parents - Parent pointers for duplicate sets.
 * @returns File indexes grouped by duplicate root.
 */
function groupIndexesByRoot(
  fileCount: number,
  parents: readonly number[]
): readonly Readonly<{ indexes: readonly number[]; root: number }>[] {
  let groupedRoots: readonly Readonly<{ indexes: readonly number[]; root: number }>[] = [];

  for (const index of createInitialParents(fileCount)) {
    const root = findParent(parents, index);
    groupedRoots = appendIndexToRoot(groupedRoots, root, index);
  }

  return groupedRoots;
}

/**
 * Returns whether an optional duplicate-group value is present.
 * @param group - Optional duplicate group value.
 * @returns True when the group is non-null.
 */
export function isDuplicateGroup(group: IDuplicateGroup | null): group is IDuplicateGroup {
  return group !== null;
}

/**
 * Creates one pair-match entry for the pair-match lookup map.
 * @param evaluation - Duplicate pair evaluation.
 * @returns Pair-match lookup entry.
 */
function toPairMatchEntry(
  evaluation: Readonly<{
    leftIndex: number;
    matched: readonly IStrategyMatch[];
    rightIndex: number;
  }>
): readonly [string, readonly IStrategyMatch[]] {
  return [createPairId(evaluation.leftIndex, evaluation.rightIndex), evaluation.matched];
}

/**
 * Merges two duplicate sets in the disjoint-set structure.
 * @param parents - Parent pointers for each file index.
 * @param leftIndex - First file index.
 * @param rightIndex - Second file index.
 * @returns Updated parent pointers.
 */
export function unionParents(
  parents: readonly number[],
  leftIndex: number,
  rightIndex: number
): readonly number[] {
  const leftRoot = findParent(parents, leftIndex);
  const rightRoot = findParent(parents, rightIndex);

  if (leftRoot === rightRoot) {
    return parents;
  }

  return replaceParent(parents, rightRoot, leftRoot);
}
