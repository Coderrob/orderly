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
  readonly pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>;
  readonly parents: readonly number[];
}

/**
 * Adds one `ALL`-mode duplicate pair into the grouping state when it satisfies the mode.
 * @param params - Grouping append parameters.
 * @returns Updated grouping state.
 */
function appendAllModePair(
  params: Readonly<{
    fileIndexesByPath: Readonly<ReadonlyMap<string, number>>;
    matchedPathPair: Readonly<{
      leftPath: string;
      matched: readonly IStrategyMatch[];
      rightPath: string;
    }>;
    state: Readonly<IAllModeGroupState>;
    strategyExecutions: readonly IStrategyExecution[];
  }>
): Readonly<IAllModeGroupState> {
  const pairIndexes = resolvePathPairIndexes(params.fileIndexesByPath, params.matchedPathPair);
  if (!pairIndexes || !shouldAppendAllModePair(params)) {
    return params.state;
  }

  return {
    parents: unionParents(params.state.parents, pairIndexes.leftIndex, pairIndexes.rightIndex),
    pairMatches: appendPairMatch(
      params.state.pairMatches,
      pairIndexes,
      params.matchedPathPair.matched
    )
  };
}

/**
 * Adds one pair-match entry into the pair-match lookup map.
 * @param pairMatches - Existing pair-match lookup.
 * @param pairIndexes - Duplicate pair indexes.
 * @param matched - Matching strategies for the pair.
 * @returns Updated pair-match lookup.
 */
function appendPairMatch(
  pairMatches: Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>>,
  pairIndexes: Readonly<{ leftIndex: number; rightIndex: number }>,
  matched: readonly IStrategyMatch[]
): Readonly<ReadonlyMap<string, readonly IStrategyMatch[]>> {
  const nextPairMatches = new Map(pairMatches);
  nextPairMatches.set(createPairId(pairIndexes.leftIndex, pairIndexes.rightIndex), matched);
  return nextPairMatches;
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

  const fileIndexesByPath = createFileIndexesByPath(files);
  let state: Readonly<IAllModeGroupState> = {
    parents: createInitialParents(files.length),
    pairMatches: new Map()
  };

  for (const matchedPathPair of createMatchedPathPairMap(strategyExecutions).values()) {
    state = appendAllModePair({
      fileIndexesByPath,
      matchedPathPair,
      state,
      strategyExecutions
    });
  }

  return buildGroupsFromParents(files, state.parents, state.pairMatches);
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
