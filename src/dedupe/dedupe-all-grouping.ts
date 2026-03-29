import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { createDuplicatePairEvaluations } from './dedupe-duplicate-pair-evaluations';
import { buildGroupsFromPairEvaluations } from './dedupe-grouping';
import { DedupeMode, type IDuplicateGroup } from './types';

/**
 * Creates duplicate groups for `ALL` mode using duplicate-pair evaluations.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @param mode - Strategy composition mode.
 * @returns Duplicate groups with multiple files per group.
 */
export function groupAllModeCandidates(
  files: readonly IScannedFile[],
  strategyExecutions: readonly IStrategyExecution[],
  mode: Readonly<DedupeMode>
): IDuplicateGroup[] {
  const pairEvaluations = createDuplicatePairEvaluations(files, strategyExecutions, mode);
  return buildGroupsFromPairEvaluations(files, pairEvaluations);
}
