import type { IStrategyExecution } from './dedupe-analysis.helpers';

const MIN_DUPLICATE_GROUP_SIZE = 2;

/**
 * Returns whether a dedupe grouping pass has enough input to produce duplicate groups.
 * @param files - Files being analyzed for duplicates.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns True when grouping work should continue.
 */
export function hasGroupableInput(
  files: readonly unknown[],
  strategyExecutions: readonly IStrategyExecution[]
): boolean {
  return files.length >= MIN_DUPLICATE_GROUP_SIZE && strategyExecutions.length > 0;
}
