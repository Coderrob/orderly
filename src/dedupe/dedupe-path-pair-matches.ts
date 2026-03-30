import { type IStrategyExecution, type IStrategyMatch } from './dedupe-analysis.helpers';
import { createDuplicateCandidateBuckets } from './dedupe-candidate-pairs';
import { isDuplicatePair } from './dedupe-pair-evaluation';
import { DedupeMode } from './types';

interface IResolvedPathPairMatch {
  readonly leftPath: string;
  readonly matched: readonly IStrategyMatch[];
  readonly rightPath: string;
}

export type { IResolvedPathPairMatch };

/**
 * Appends one strategy match to an existing matched-strategy list.
 * @param matched - Existing matched strategies.
 * @param strategy - Strategy identifier.
 * @param key - Strategy key.
 * @returns Updated matched-strategy list.
 */
function appendMatchedStrategy(
  matched: readonly IStrategyMatch[] | undefined,
  strategy: string,
  key: string
): readonly IStrategyMatch[] {
  return [...(matched ?? []), { strategy, key }];
}

/**
 * Counts enabled strategies that produced keys for both file paths.
 * @param leftPath - First file path.
 * @param rightPath - Second file path.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Applicable strategy count for the pair.
 */
export function countApplicableStrategies(
  leftPath: string,
  rightPath: string,
  strategyExecutions: readonly IStrategyExecution[]
): number {
  let applicableStrategies = 0;

  for (const execution of strategyExecutions) {
    if (execution.keysByPath.has(leftPath) && execution.keysByPath.has(rightPath)) {
      applicableStrategies += 1;
    }
  }

  return applicableStrategies;
}

/**
 * Creates matched path pairs from strategy buckets.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Path-pair matches keyed by stable path pair id.
 */
export function createMatchedPathPairMap(
  strategyExecutions: readonly IStrategyExecution[]
): ReadonlyMap<string, Readonly<IResolvedPathPairMatch>> {
  const matchedPathPairs = new Map<string, Readonly<IResolvedPathPairMatch>>();

  for (const bucket of createDuplicateCandidateBuckets(strategyExecutions)) {
    for (let leftIndex = 0; leftIndex < bucket.paths.length - 1; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < bucket.paths.length; rightIndex++) {
        const leftPath = bucket.paths[leftIndex];
        const rightPath = bucket.paths[rightIndex];
        const orderedPaths = createOrderedPaths(leftPath, rightPath);
        const pairId = `${orderedPaths.leftPath}::${orderedPaths.rightPath}`;
        const existingMatch = matchedPathPairs.get(pairId);

        matchedPathPairs.set(pairId, {
          leftPath: orderedPaths.leftPath,
          rightPath: orderedPaths.rightPath,
          matched: appendMatchedStrategy(existingMatch?.matched, bucket.strategy, bucket.key)
        });
      }
    }
  }

  return matchedPathPairs;
}

/**
 * Creates alphabetically ordered file paths for stable pair ids.
 * @param leftPath - First file path.
 * @param rightPath - Second file path.
 * @returns Ordered file paths.
 */
function createOrderedPaths(
  leftPath: string,
  rightPath: string
): Readonly<{ leftPath: string; rightPath: string }> {
  return leftPath < rightPath
    ? { leftPath, rightPath }
    : { leftPath: rightPath, rightPath: leftPath };
}

/**
 * Returns whether one matched path pair satisfies the configured mode.
 * @param matchedPathPair - Matched path-pair metadata.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @param mode - Strategy composition mode.
 * @returns True when the pair should be treated as duplicate.
 */
export function shouldCreateDuplicatePairEvaluation(
  matchedPathPair: Readonly<IResolvedPathPairMatch>,
  strategyExecutions: readonly IStrategyExecution[],
  mode: Readonly<DedupeMode>
): boolean {
  const applicableStrategies = countApplicableStrategies(
    matchedPathPair.leftPath,
    matchedPathPair.rightPath,
    strategyExecutions
  );

  return isDuplicatePair(matchedPathPair.matched, applicableStrategies, mode);
}
