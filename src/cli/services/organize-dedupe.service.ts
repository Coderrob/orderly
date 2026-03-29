import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import type { IDedupeConfig, IDedupeResult } from '../../dedupe/types';
import { Logger } from '../../logger/logger';
import type { IScannedFile } from '../../scanner/interfaces';
import {
  buildDedupeActionContext,
  handleReplacedDuplicates,
  handleSkippedDuplicates,
  type IDedupeActionContext
} from '../commands/organize.command.helpers';
import type { IOrganizeOptions } from '../interfaces';

import { DedupeRuntime } from './dedupe-runtime.service';

/**
 * Resolves the file set that continues through organize after dedupe handling.
 */
export class OrganizeDedupeService {
  /**
   * Creates a new OrganizeDedupeService instance.
   * @param dedupeRuntime - Shared dedupe runtime helper.
   */
  constructor(private readonly dedupeRuntime: Readonly<DedupeRuntime> = new DedupeRuntime()) {}

  /**
   * Applies organize-specific dedupe handling and returns remaining files.
   * @param files - Scanned files.
   * @param config - Loaded organize config.
   * @param logger - Logger instance.
   * @param options - Organize command options.
   * @returns Files that should continue to organization.
   */
  async resolveFiles(
    files: readonly IScannedFile[],
    config: Readonly<OrderlyConfig>,
    logger: Readonly<Logger>,
    options: Readonly<IOrganizeOptions>
  ): Promise<IScannedFile[]> {
    const dedupeConfig = config.dedupe;
    if (!dedupeConfig) {
      return [...files];
    }

    const dedupeContext = await this.createDedupeActionContext(
      files,
      dedupeConfig,
      { deleteDuplicates: !config.dryRun, quarantineDir: options.quarantineDir },
      logger
    );
    if (!dedupeContext) {
      return [...files];
    }

    this.logDedupeActionOutcome(dedupeContext.action, dedupeContext.dedupeOutcome, logger);
    return this.resolveDedupeFilesForAction(dedupeContext);
  }

  /**
   * Builds dedupe context used to resolve post-dedupe file selection.
   * @param files - Scanned files.
   * @param dedupeConfig - Active dedupe configuration.
   * @param options - Dedupe execution options.
   * @param logger - Logger instance.
   * @returns Dedupe context when duplicates exist; otherwise null.
   */
  private async createDedupeActionContext(
    files: readonly IScannedFile[],
    dedupeConfig: Readonly<IDedupeConfig>,
    options: Readonly<{ deleteDuplicates: boolean; quarantineDir?: string }>,
    logger: Readonly<Logger>
  ): Promise<Readonly<IDedupeActionContext> | null> {
    const dedupeResult = await this.findDuplicateGroups(files, dedupeConfig, logger);
    if (!dedupeResult) {
      return null;
    }

    const dedupeOutcome = await this.dedupeRuntime.applyConfiguredAction(dedupeConfig, dedupeResult);
    return buildDedupeActionContext({
      action: dedupeConfig.action,
      dedupeOutcome,
      dedupeResult,
      files,
      logger,
      options
    });
  }

  /**
   * Finds duplicate groups and logs summary information.
   * @param files - Scanned files.
   * @param dedupeConfig - Active dedupe configuration.
   * @param logger - Logger instance.
   * @returns Dedupe result when groups are found; otherwise null.
   */
  private async findDuplicateGroups(
    files: readonly IScannedFile[],
    dedupeConfig: Readonly<IDedupeConfig>,
    logger: Readonly<Logger>
  ): Promise<IDedupeResult | null> {
    logger.info('Running duplicate detection...');
    const dedupeResult = await this.dedupeRuntime.findDuplicates(dedupeConfig, files);
    logger.info(
      `Found ${dedupeResult.totalDuplicates} duplicate files in ${dedupeResult.groups.length} groups`
    );
    return dedupeResult.groups.length === 0 ? null : dedupeResult;
  }

  /**
   * Resolves which file set continues to organization for a dedupe action.
   * @param params - Dedupe action context.
   * @returns Files to continue organizing.
   */
  private resolveDedupeFilesForAction(params: Readonly<IDedupeActionContext>): IScannedFile[] {
    if (params.action === DedupeAction.SKIP) {
      return handleSkippedDuplicates(
        params.filteredFiles,
        params.dedupeGroupCount,
        params.dedupeOutcome.skipped.length,
        params.logger
      );
    }

    if (params.action === DedupeAction.REPLACE) {
      return handleReplacedDuplicates(
        params.filteredFiles,
        params.dedupeOutcome.replaced,
        { deleteDuplicates: params.deleteDuplicates, quarantineDir: params.quarantineDir },
        params.logger
      );
    }

    return [...params.files];
  }

  /**
   * Logs the dedupe action summary.
   * @param action - Applied dedupe action.
   * @param dedupeOutcome - Result of applying the dedupe action.
   * @param logger - Logger instance.
   */
  private logDedupeActionOutcome(
    action: Readonly<DedupeAction>,
    dedupeOutcome: Readonly<{
      replaced: readonly IScannedFile[];
      skipped: readonly IScannedFile[];
    }>,
    logger: Readonly<Logger>
  ): void {
    const affectedFiles = dedupeOutcome.skipped.length + dedupeOutcome.replaced.length;
    logger.info(`Dedupe action '${action}' applied: ${affectedFiles} files affected`);
  }
}
