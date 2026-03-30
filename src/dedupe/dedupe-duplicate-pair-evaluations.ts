import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import {
  createFileIndexesByPath,
  isDuplicatePairEvaluation,
  type IDuplicatePairEvaluation
} from './dedupe-pair-evaluation';
import { createMatchedPathPairMap } from './dedupe-path-pair-matches';
import { toDuplicatePairEvaluation } from './dedupe-resolved-pair-evaluation';
import { DedupeMode } from './types';

/**
 * Creates duplicate-pair evaluations from matched strategy buckets.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @param mode - Strategy composition mode.
 * @returns Duplicate pair evaluations that satisfied the configured mode.
 */
export function createDuplicatePairEvaluations(
  files: readonly IScannedFile[],
  strategyExecutions: readonly IStrategyExecution[],
  mode: Readonly<DedupeMode>
): readonly IDuplicatePairEvaluation[] {
  const fileIndexesByPath = createFileIndexesByPath(files);

  return [...createMatchedPathPairMap(strategyExecutions).values()]
    .map(toDuplicatePairEvaluation(fileIndexesByPath, strategyExecutions, mode))
    .filter(isDuplicatePairEvaluation);
}
