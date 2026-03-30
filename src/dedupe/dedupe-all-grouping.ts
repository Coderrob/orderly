import type { IScannedFile } from '../scanner/interfaces';

import {
  createInitialParents,
  createPairId,
  type IStrategyExecution,
  type IStrategyMatch
} from './dedupe-analysis.helpers';
import { buildGroupsFromParents, unionParents } from './dedupe-grouping';
import { hasGroupableInput } from './dedupe-grouping-input';
import { createFileIndexesByPath } from './dedupe-pair-evaluation';
import {
  createMatchedPathPairMap,
  shouldCreateDuplicatePairEvaluation
} from './dedupe-path-pair-matches';
import { resolvePathPairIndexes } from './dedupe-resolved-pair-evaluation';
import { DedupeMode, type IDuplicateGroup } from './types';

interface IAllModeGroupState {
  readonly parents: readonly number[];
}

interface IAllModePairCollectionState {
  readonly pairMatches: ReadonlyMap<string, readonly IStrategyMatch[]>;
  readonly state: Readonly<IAllModeGroupState>;
}

/**
 * Appends one accepted matched path pair to the current `ALL`-mode collection state.
 * @param params - Pair collection parameters.
 * @returns Updated collection state.
 */
function appendAcceptedAllModePair(
  params: Readonly<{
    matched: readonly IStrategyMatch[];
    pairIndexes: Readonly<{ leftIndex: number; rightIndex: number }>;
    pairMatches: ReadonlyMap<string, readonly IStrategyMatch[]>;
    state: Readonly<IAllModeGroupState>;
  }>
): Readonly<IAllModePairCollectionState> {
  const pairMatches = new Map(params.pairMatches);

  pairMatches.set(
    createPairId(params.pairIndexes.leftIndex, params.pairIndexes.rightIndex),
    params.matched
  );

  return {
    pairMatches,
    state: appendAllModePair({ pairIndexes: params.pairIndexes, state: params.state })
  };
}

/**
 * Adds one `ALL`-mode duplicate pair into the grouping state when it satisfies the mode.
 * @param params - Grouping append parameters.
 * @returns Updated grouping state.
 */
function appendAllModePair(
  params: Readonly<{
    pairIndexes: Readonly<{ leftIndex: number; rightIndex: number }>;
    state: Readonly<IAllModeGroupState>;
  }>
): Readonly<IAllModeGroupState> {
  return {
    parents: unionParents(
      params.state.parents,
      params.pairIndexes.leftIndex,
      params.pairIndexes.rightIndex
    )
  };
}

/**
 * Collects accepted matched path pairs for `ALL` mode.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Pair collection state.
 */
function collectAcceptedAllModePairs(
  files: readonly IScannedFile[],
  strategyExecutions: readonly IStrategyExecution[]
): Readonly<IAllModePairCollectionState> {
  const fileIndexesByPath = createFileIndexesByPath(files);
  let collectionState = createInitialAllModePairCollectionState(files.length);

  for (const matchedPathPair of createMatchedPathPairMap(strategyExecutions).values()) {
    const pairIndexes = resolveAcceptedAllModePair(
      fileIndexesByPath,
      matchedPathPair,
      strategyExecutions
    );
    if (!pairIndexes) {
      continue;
    }

    collectionState = appendAcceptedAllModePair({
      matched: matchedPathPair.matched,
      pairIndexes,
      pairMatches: collectionState.pairMatches,
      state: collectionState.state
    });
  }

  return collectionState;
}

/**
 * Creates the initial grouping state for `ALL` mode.
 * @param fileCount - Number of scanned files.
 * @returns Initial grouping state.
 */
function createInitialAllModeGroupState(fileCount: number): Readonly<IAllModeGroupState> {
  return {
    parents: createInitialParents(fileCount)
  };
}

/**
 * Creates the initial pair collection state for `ALL` mode.
 * @param fileCount - Number of scanned files.
 * @returns Initial collection state.
 */
function createInitialAllModePairCollectionState(
  fileCount: number
): Readonly<IAllModePairCollectionState> {
  return {
    pairMatches: new Map<string, readonly IStrategyMatch[]>(),
    state: createInitialAllModeGroupState(fileCount)
  };
}

/**
 * Creates duplicate groups for `ALL` mode using matched path-pair aggregation.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Duplicate groups with multiple files per group.
 */
export function groupAllModeCandidates(
  files: readonly IScannedFile[],
  strategyExecutions: readonly IStrategyExecution[]
): IDuplicateGroup[] {
  if (!hasGroupableInput(files, strategyExecutions)) {
    return [];
  }

  const collectionState = collectAcceptedAllModePairs(files, strategyExecutions);
  return buildGroupsFromParents(files, collectionState.state.parents, collectionState.pairMatches);
}

/**
 * Resolves accepted duplicate pair indexes for one `ALL`-mode path pair.
 * @param fileIndexesByPath - File-index lookup keyed by original path.
 * @param matchedPathPair - Matched path-pair metadata.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Accepted duplicate pair indexes, or undefined when rejected.
 */
function resolveAcceptedAllModePair(
  fileIndexesByPath: Readonly<ReadonlyMap<string, number>>,
  matchedPathPair: Readonly<{
    leftPath: string;
    matched: readonly IStrategyMatch[];
    rightPath: string;
  }>,
  strategyExecutions: readonly IStrategyExecution[]
): Readonly<{ leftIndex: number; rightIndex: number }> | undefined {
  const pairIndexes = resolvePathPairIndexes(fileIndexesByPath, matchedPathPair);
  return pairIndexes && shouldAppendAllModePair({ matchedPathPair, strategyExecutions })
    ? pairIndexes
    : undefined;
}

/**
 * Returns whether one matched path pair should be appended to the `ALL` grouping state.
 * @param params - Grouping append parameters.
 * @returns True when the pair satisfies the configured mode.
 */
function shouldAppendAllModePair(
  params: Readonly<{
    matchedPathPair: Readonly<{
      leftPath: string;
      matched: readonly IStrategyMatch[];
      rightPath: string;
    }>;
    strategyExecutions: readonly IStrategyExecution[];
  }>
): boolean {
  return shouldCreateDuplicatePairEvaluation(
    params.matchedPathPair,
    params.strategyExecutions,
    DedupeMode.ALL
  );
}
