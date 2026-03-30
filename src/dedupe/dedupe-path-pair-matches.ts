import { type IStrategyExecution, type IStrategyMatch } from './dedupe-analysis.helpers';
import {
  createDuplicateCandidateBuckets,
  type IDuplicateCandidateBucket
} from './dedupe-candidate-pairs';
import { isDuplicatePair } from './dedupe-pair-evaluation';
import { DedupeMode } from './types';

interface IResolvedPathPairMatch {
  readonly leftPath: string;
  readonly matched: readonly IStrategyMatch[];
  readonly rightPath: string;
}

export type { IResolvedPathPairMatch };

/**
 * Adds matched path pairs for one duplicate bucket.
 * @param bucket - Duplicate candidate bucket.
 * @param matchedPathPairs - Path-pair match accumulator keyed by path pair id.
 * @returns Updated path-pair match accumulator.
 */
function appendMatchedPathPairs(
  bucket: Readonly<IDuplicateCandidateBucket>,
  matchedPathPairs: Readonly<ReadonlyMap<string, Readonly<IResolvedPathPairMatch>>>
): ReadonlyMap<string, Readonly<IResolvedPathPairMatch>> {
  const nextMatchedPathPairs = new Map(matchedPathPairs);

  for (let leftIndex = 0; leftIndex < bucket.paths.length - 1; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < bucket.paths.length; rightIndex++) {
      const leftPath = bucket.paths[leftIndex];
      const rightPath = bucket.paths[rightIndex];
      const orderedPaths =
        leftPath < rightPath
          ? { leftPath, rightPath }
          : { leftPath: rightPath, rightPath: leftPath };
      const pairId = `${orderedPaths.leftPath}::${orderedPaths.rightPath}`;
      const existingMatch = nextMatchedPathPairs.get(pairId);

      nextMatchedPathPairs.set(pairId, {
        leftPath: orderedPaths.leftPath,
        rightPath: orderedPaths.rightPath,
        matched: [...(existingMatch?.matched ?? []), { strategy: bucket.strategy, key: bucket.key }]
      });
    }
  }

  return nextMatchedPathPairs;
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
  let matchedPathPairs: ReadonlyMap<string, Readonly<IResolvedPathPairMatch>> = new Map();

  for (const bucket of createDuplicateCandidateBuckets(strategyExecutions)) {
    matchedPathPairs = appendMatchedPathPairs(bucket, matchedPathPairs);
  }

  return matchedPathPairs;
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
