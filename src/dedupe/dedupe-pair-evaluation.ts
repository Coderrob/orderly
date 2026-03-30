import { IScannedFile } from '../scanner/interfaces';

import type { IIndexPair, IStrategyExecution, IStrategyMatch } from './dedupe-analysis.helpers';
import type { IPathPair } from './dedupe-candidate-pairs';
import { DedupeMode } from './types';

interface IDuplicatePairEvaluation {
  readonly leftIndex: number;
  readonly matched: readonly IStrategyMatch[];
  readonly rightIndex: number;
}

interface IPairMatchResult {
  readonly applicableStrategies: number;
  readonly matched: readonly IStrategyMatch[];
}

export type { IDuplicatePairEvaluation, IPairMatchResult };

/**
 * Creates one duplicate pair evaluation when the pair satisfies the configured mode.
 * @param files - Files being analyzed for duplicates.
 * @param pair - File-index pair being evaluated.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @param mode - Strategy composition mode.
 * @returns Duplicate pair evaluation or null when the pair is not a duplicate.
 */
export function createDuplicatePairEvaluation(
  files: readonly IScannedFile[],
  pair: Readonly<IIndexPair>,
  strategyExecutions: readonly IStrategyExecution[],
  mode: Readonly<DedupeMode>
): Readonly<IDuplicatePairEvaluation> | null {
  const matchResult = findPairMatches(
    files[pair.leftIndex].originalPath,
    files[pair.rightIndex].originalPath,
    strategyExecutions
  );
  return isDuplicatePair(matchResult.matched, matchResult.applicableStrategies, mode)
    ? { ...pair, matched: matchResult.matched }
    : null;
}

/**
 * Creates file-index lookup data keyed by original path.
 * @param files - Files being analyzed for duplicates.
 * @returns File-index lookup map.
 */
export function createFileIndexesByPath(
  files: readonly IScannedFile[]
): ReadonlyMap<string, number> {
  return new Map(files.map(toFileIndexEntry));
}

/**
 * Finds matching strategy keys for a pair of files.
 * @param leftPath - First file path.
 * @param rightPath - Second file path.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Applicable strategy count and matching strategies.
 */
export function findPairMatches(
  leftPath: string,
  rightPath: string,
  strategyExecutions: readonly IStrategyExecution[]
): IPairMatchResult {
  let matched: readonly IStrategyMatch[] = [];
  let applicableStrategies = 0;

  for (const execution of strategyExecutions) {
    const leftKey = execution.keysByPath.get(leftPath);
    const rightKey = execution.keysByPath.get(rightPath);

    if (leftKey === undefined || rightKey === undefined) {
      continue;
    }

    applicableStrategies += 1;
    if (leftKey === rightKey) {
      matched = [...matched, { strategy: execution.strategy, key: leftKey }];
    }
  }

  return { applicableStrategies, matched };
}

/**
 * Determines whether a pair is duplicate under the configured composition mode.
 * @param matchedStrategies - Strategies whose keys matched for the pair.
 * @param applicableStrategies - Enabled strategies that produced keys for both files.
 * @param mode - Strategy composition mode.
 * @returns True when the pair should be treated as duplicate.
 */
export function isDuplicatePair(
  matchedStrategies: readonly IStrategyMatch[],
  applicableStrategies: number,
  mode: Readonly<DedupeMode>
): boolean {
  if (mode === DedupeMode.ALL) {
    return applicableStrategies > 0 && matchedStrategies.length === applicableStrategies;
  }

  return matchedStrategies.length > 0;
}

/**
 * Returns whether an optional duplicate-pair evaluation is present.
 * @param pairEvaluation - Optional duplicate-pair evaluation.
 * @returns True when the evaluation is non-null.
 */
export function isDuplicatePairEvaluation(
  pairEvaluation: IDuplicatePairEvaluation | null
): pairEvaluation is IDuplicatePairEvaluation {
  return pairEvaluation !== null;
}

/**
 * Converts one scanned file into a file-index lookup entry.
 * @param file - Scanned file.
 * @param index - File index.
 * @returns File-index lookup entry.
 */
export function toFileIndexEntry(
  file: Readonly<IScannedFile>,
  index: number
): readonly [string, number] {
  return [file.originalPath, index];
}

/**
 * Converts one file-path pair into file indexes when both paths are known.
 * @param pair - Candidate file-path pair.
 * @param fileIndexesByPath - File-index lookup keyed by original path.
 * @returns File-index pair or null when either path is unknown.
 */
export function toIndexPair(
  pair: Readonly<IPathPair>,
  fileIndexesByPath: Readonly<ReadonlyMap<string, number>>
): IIndexPair | null {
  const leftIndex = fileIndexesByPath.get(pair.leftPath);
  const rightIndex = fileIndexesByPath.get(pair.rightPath);
  return leftIndex === undefined || rightIndex === undefined ? null : { leftIndex, rightIndex };
}
