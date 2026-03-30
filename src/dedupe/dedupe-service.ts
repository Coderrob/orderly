import type { IScannedFile } from '../scanner/interfaces';

import {
  buildDedupeResult,
  buildReportActionOutcome,
  buildReplaceActionOutcome,
  buildSkipActionOutcome
} from './dedupe-analysis.helpers';
import { groupCandidates } from './dedupe-group-resolution';
import { unionParents } from './dedupe-grouping';
import { executeStrategies } from './dedupe-strategy-execution';
import { IDedupeService, IDedupeStrategy } from './interfaces';
import { DedupeAction, DedupeMode, IDedupeOutcome, IDedupeResult } from './types';

/**
 * Main dedupe orchestration service.
 * Coordinates multiple strategies to find and handle duplicate files.
 */
export class DedupeService implements IDedupeService {
  /**
   * Creates a new DedupeService instance
   * @param strategies - Array of deduplication strategies to use for finding duplicates
   * @param mode - Composition mode for combining strategy matches
   */
  constructor(
    private readonly strategies: readonly IDedupeStrategy[],
    private readonly mode: Readonly<DedupeMode> = DedupeMode.ANY
  ) {}

  /**
   * Finds duplicate files using all configured strategies.
   * Compares files pairwise so strategy composition mode is honored consistently.
   * @param files - Array of scanned files to analyze for duplicates
   * @returns Dedupe result containing groups of duplicates and metadata about the analysis
   */
  async findDuplicates(files: readonly IScannedFile[]): Promise<IDedupeResult> {
    const strategyExecutions = await executeStrategies(this.strategies, files);
    const groups = groupCandidates(files, strategyExecutions, this.mode);
    return buildDedupeResult(files.length, groups, strategyExecutions);
  }

  /**
   * Applies the configured action to duplicate groups.
   * Currently supports SKIP, REPORT, and REPLACE actions.
   * Async for future extensibility (e.g., REPLACE action may need file operations).
   * @param result - Dedupe result containing duplicate groups to process
   * @param action - Action to apply to the duplicate groups (SKIP, REPORT, or REPLACE)
   * @returns Dedupe outcome with details about the action applied
   * @throws {Error} Thrown when an unsupported dedupe action is requested.
   */
  applyAction(
    result: Readonly<IDedupeResult>,
    action: Readonly<DedupeAction>
  ): Promise<IDedupeOutcome> {
    switch (action) {
      case DedupeAction.SKIP:
        return Promise.resolve(buildSkipActionOutcome(result));
      case DedupeAction.REPORT:
        return Promise.resolve(buildReportActionOutcome(result));
      case DedupeAction.REPLACE:
        return Promise.resolve(buildReplaceActionOutcome(result));
      default:
        return Promise.reject(new Error(`Unsupported dedupe action: ${String(action)}`));
    }
  }

  /**
   * Merges two duplicate sets in the disjoint-set structure.
   * @param parents - Parent pointers for each file index.
   * @param leftIndex - First file index.
   * @param rightIndex - Second file index.
   * @returns Updated parent pointers.
   */
  private union(
    parents: readonly number[],
    leftIndex: number,
    rightIndex: number
  ): readonly number[] {
    return unionParents(parents, leftIndex, rightIndex);
  }
}
