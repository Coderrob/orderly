import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { type IDuplicatePairEvaluation } from './dedupe-pair-evaluation';
import {
  shouldCreateDuplicatePairEvaluation,
  type IResolvedPathPairMatch
} from './dedupe-path-pair-matches';
import { DedupeMode } from './types';

/**
 * Creates file indexes for one matched path pair when both paths are known.
 * @param fileIndexesByPath - File-index lookup keyed by original path.
 * @param matchedPathPair - Matched path-pair metadata.
 * @returns File indexes or null when either path is unknown.
 */
export function resolvePathPairIndexes(
  fileIndexesByPath: Readonly<ReadonlyMap<string, number>>,
  matchedPathPair: Readonly<IResolvedPathPairMatch>
): Readonly<{ leftIndex: number; rightIndex: number }> | null {
  const leftIndex = fileIndexesByPath.get(matchedPathPair.leftPath);
  const rightIndex = fileIndexesByPath.get(matchedPathPair.rightPath);

  return leftIndex === undefined || rightIndex === undefined ? null : { leftIndex, rightIndex };
}

/**
 * Converts one matched path pair into a duplicate pair evaluation when the mode passes.
 * @param fileIndexesByPath - File-index lookup keyed by original path.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @param mode - Strategy composition mode.
 * @returns Duplicate pair evaluation resolver.
 */
export function toDuplicatePairEvaluation(
  fileIndexesByPath: Readonly<ReadonlyMap<string, number>>,
  strategyExecutions: readonly IStrategyExecution[],
  mode: Readonly<DedupeMode>
): (matchedPathPair: Readonly<IResolvedPathPairMatch>) => IDuplicatePairEvaluation | null {
  /**
   * Resolves one matched path pair into file indexes when the mode passes.
   * @param matchedPathPair - Matched path-pair metadata.
   * @returns Duplicate pair evaluation or null when the mode fails.
   */
  function resolveDuplicatePairEvaluation(
    matchedPathPair: Readonly<IResolvedPathPairMatch>
  ): IDuplicatePairEvaluation | null {
    const pairIndexes = resolvePathPairIndexes(fileIndexesByPath, matchedPathPair);
    if (!pairIndexes) {
      return null;
    }

    return shouldCreateDuplicatePairEvaluation(matchedPathPair, strategyExecutions, mode)
      ? { ...pairIndexes, matched: matchedPathPair.matched }
      : null;
  }

  return resolveDuplicatePairEvaluation;
}
