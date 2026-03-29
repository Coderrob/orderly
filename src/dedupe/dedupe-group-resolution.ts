import type { IScannedFile } from '../scanner/interfaces';

import { groupAllModeCandidates } from './dedupe-all-grouping';
import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { groupAnyModeCandidates } from './dedupe-any-grouping';
import { DedupeMode, type IDuplicateGroup } from './types';

const MIN_DUPLICATE_GROUP_SIZE = 2;

/**
 * Creates duplicate groups from strategy executions.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @param mode - Strategy composition mode.
 * @returns Duplicate groups with multiple files per group.
 */
export function groupCandidates(
  files: readonly IScannedFile[],
  strategyExecutions: readonly IStrategyExecution[],
  mode: Readonly<DedupeMode>
): IDuplicateGroup[] {
  if (files.length < MIN_DUPLICATE_GROUP_SIZE || strategyExecutions.length === 0) {
    return [];
  }

  if (mode === DedupeMode.ANY) {
    return groupAnyModeCandidates(files, strategyExecutions);
  }

  return groupAllModeCandidates(files, strategyExecutions, mode);
}
