import { DedupeAction, type IDedupeResult } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import type { IDedupeService } from '../../dedupe/interfaces';
import type { IDedupeConfig } from '../../dedupe/types';
import type { IScannedFile } from '../../scanner/interfaces';

/**
 * Shared runtime wrapper for dedupe service creation and execution.
 */
export class DedupeRuntime {
  /**
   * Applies the configured dedupe action.
   * @param dedupeConfig - Active dedupe configuration.
   * @param dedupeResult - Dedupe result to process.
   * @returns Dedupe action outcome.
   */
  applyConfiguredAction(
    dedupeConfig: Readonly<IDedupeConfig>,
    dedupeResult: Readonly<IDedupeResult>
  ): Promise<{ replaced: readonly IScannedFile[]; skipped: readonly IScannedFile[] }> {
    return this.createService(dedupeConfig).applyAction(dedupeResult, dedupeConfig.action);
  }

  /**
   * Applies the REPLACE dedupe action.
   * @param dedupeConfig - Active dedupe configuration.
   * @param dedupeResult - Dedupe result to process.
   * @returns Replace action outcome.
   */
  applyReplaceAction(
    dedupeConfig: Readonly<IDedupeConfig>,
    dedupeResult: Readonly<IDedupeResult>
  ): Promise<{ replaced: readonly IScannedFile[]; skipped: readonly IScannedFile[] }> {
    return this.createService(dedupeConfig).applyAction(dedupeResult, DedupeAction.REPLACE);
  }

  /**
   * Finds duplicate groups for the provided files.
   * @param dedupeConfig - Active dedupe configuration.
   * @param files - Files to analyze.
   * @returns Dedupe result.
   */
  findDuplicates(
    dedupeConfig: Readonly<IDedupeConfig>,
    files: readonly IScannedFile[]
  ): Promise<IDedupeResult> {
    return this.createService(dedupeConfig).findDuplicates(files);
  }

  /**
   * Creates a dedupe service for one configuration.
   * @param dedupeConfig - Active dedupe configuration.
   * @returns Dedupe service instance.
   */
  private createService(dedupeConfig: Readonly<IDedupeConfig>): IDedupeService {
    return DedupeStrategyFactory.createDedupeService(dedupeConfig);
  }
}
