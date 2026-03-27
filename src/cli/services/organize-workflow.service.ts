import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import type { IDedupeConfig, IDedupeResult } from '../../dedupe/types';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import {
  buildDedupeActionContext,
  handleReplacedDuplicates,
  handleSkippedDuplicates,
  type IDedupeActionContext
} from '../commands/organize.command.helpers';
import { COMMAND_MESSAGES } from '../constants';
import type { ICleanerService, IManifestService, IOrganizeOptions } from '../interfaces';

export interface IOrganizeWorkflowContext {
  readonly config: OrderlyConfig;
  readonly logger: Logger;
  readonly organizer: FileOrganizer;
  readonly scanner: FileScanner;
  readonly targetDir: string;
}

export interface IOrganizeWorkflow {
  run(
    commandContext: Readonly<IOrganizeWorkflowContext>,
    options: Readonly<IOrganizeOptions>
  ): Promise<IOrganizationResult>;
}

/**
 * Runs the organize workflow after CLI inputs have been resolved.
 */
export class OrganizeWorkflow implements IOrganizeWorkflow {
  /**
   * Creates a new OrganizeWorkflow instance.
   * @param manifestService - Service for generating and saving manifests.
   * @param cleaner - Optional empty-directory cleaner for post-organize cleanup.
   */
  constructor(
    private readonly manifestService: Readonly<IManifestService>,
    private readonly cleaner?: Readonly<ICleanerService>
  ) {}

  /**
   * Executes the organize workflow.
   * @param commandContext - Shared organize runtime context.
   * @param options - Organize command options.
   * @returns Organization result.
   */
  async run(
    commandContext: Readonly<IOrganizeWorkflowContext>,
    options: Readonly<IOrganizeOptions>
  ): Promise<IOrganizationResult> {
    const files = await this.scanFiles(commandContext);
    const filesToOrganize = await this.getFilesToOrganize(
      files,
      commandContext.config,
      commandContext.logger,
      options
    );
    return this.runOrganization(filesToOrganize, commandContext, options);
  }

  /**
   * Scans files and logs the scan count.
   * @param commandContext - Shared organize command context.
   * @returns Scanned files.
   */
  private async scanFiles(
    commandContext: Readonly<IOrganizeWorkflowContext>
  ): Promise<IScannedFile[]> {
    const files = await commandContext.scanner.scan(commandContext.targetDir);
    commandContext.logger.info(COMMAND_MESSAGES.FILES_FOUND.replace('{0}', String(files.length)));
    return files;
  }

  /**
   * Returns the files that should proceed to organization after dedupe processing.
   * @param files - Scanned files.
   * @param config - Configuration with dedupe settings.
   * @param logger - Logger instance.
   * @param options - Organize command options.
   * @returns Files to organize.
   */
  private async getFilesToOrganize(
    files: readonly IScannedFile[],
    config: Readonly<OrderlyConfig>,
    logger: Readonly<Logger>,
    options: Readonly<IOrganizeOptions>
  ): Promise<IScannedFile[]> {
    return config.dedupe?.enabled
      ? this.processDuplicates(files, config, logger, options)
      : [...files];
  }

  /**
   * Plans operations, executes them, and writes manifest output when requested.
   * @param files - Files to organize.
   * @param commandContext - Shared organize command context.
   * @param options - Organize command options.
   * @returns Organization result.
   */
  private runOrganization(
    files: readonly IScannedFile[],
    commandContext: Readonly<IOrganizeWorkflowContext>,
    options: Readonly<IOrganizeOptions>
  ): IOrganizationResult {
    const operations = commandContext.organizer.planOperations(files);
    commandContext.logger.info(
      COMMAND_MESSAGES.OPERATIONS_PLANNED.replace('{0}', String(operations.length))
    );

    const result = commandContext.organizer.executeOperations(operations);
    this.saveManifestIfRequested(result, options, commandContext.logger, commandContext.targetDir);
    this.cleanEmptyDirectoriesIfRequested(options, commandContext);
    this.logResults(result, commandContext.logger);
    return result;
  }

  /**
   * Cleans empty directories after organization when requested.
   * @param options - Organize command options.
   * @param commandContext - Shared command context.
   */
  private cleanEmptyDirectoriesIfRequested(
    options: Readonly<IOrganizeOptions>,
    commandContext: Readonly<{
      config: OrderlyConfig;
      logger: Logger;
      targetDir: string;
    }>
  ): void {
    if (!options.cleanEmptyDirs || !this.cleaner) {
      return;
    }

    const cleanResult = this.cleaner.clean(commandContext.targetDir, {
      dryRun: commandContext.config.dryRun,
      includeHidden: commandContext.config.includeHidden,
      removeOrderlyDir: false
    });
    commandContext.logger.info(
      `Post-organize cleanup removed ${cleanResult.removedDirectories} empty directories`
    );
  }

  /**
   * Saves manifests when the command requested them.
   * @param result - Organization result.
   * @param options - Organize command options.
   * @param logger - Logger instance.
   * @param targetDir - Directory where manifests are written.
   */
  private saveManifestIfRequested(
    result: Readonly<IOrganizationResult>,
    options: Readonly<IOrganizeOptions>,
    logger: Readonly<Logger>,
    targetDir: string
  ): void {
    if (options.manifest) {
      this.manifestService.saveManifests(result, targetDir);
      logger.info(COMMAND_MESSAGES.MANIFESTS_GENERATED);
    }
  }

  /**
   * Logs the organization results.
   * @param result - Organization result to log.
   * @param logger - Logger instance.
   */
  private logResults(result: Readonly<IOrganizationResult>, logger: Readonly<Logger>): void {
    logger.info(
      `Operations completed: ${result.successful} successful, ${result.failed} failed, ${result.skipped ?? 0} skipped`
    );

    if (result.errors.length === 0) {
      return;
    }

    logger.warn(`${result.errors.length} errors occurred during organization`);
    for (const [index, error] of result.errors.entries()) {
      logger.warn(`  ${index + 1}. ${error.file}: ${error.error}`);
    }
  }

  /**
   * Processes duplicate files according to configuration.
   * @param files - All scanned files.
   * @param config - Configuration with dedupe settings.
   * @param logger - Logger instance.
   * @param options - Organize command options.
   * @returns Filtered files to organize.
   */
  private async processDuplicates(
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

    const dedupeOutcome = await this.getDedupeOutcome(dedupeConfig, dedupeResult);
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
   * Applies the configured dedupe action and returns the outcome.
   * @param dedupeConfig - Active dedupe configuration.
   * @param dedupeResult - Detected duplicate groups.
   * @returns Dedupe action outcome.
   */
  private getDedupeOutcome(
    dedupeConfig: Readonly<IDedupeConfig>,
    dedupeResult: Readonly<IDedupeResult>
  ): Promise<{ replaced: readonly IScannedFile[]; skipped: readonly IScannedFile[] }> {
    return DedupeStrategyFactory.createDedupeService(dedupeConfig).applyAction(
      dedupeResult,
      dedupeConfig.action
    );
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
    const dedupeResult =
      await DedupeStrategyFactory.createDedupeService(dedupeConfig).findDuplicates(files);
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
      return this.resolveSkipDedupeFiles(params);
    }

    if (params.action === DedupeAction.REPLACE) {
      return this.resolveReplaceDedupeFiles(params);
    }

    return [...params.files];
  }

  /**
   * Resolves files for the SKIP dedupe action.
   * @param params - Dedupe action context.
   * @returns Files to continue organizing.
   */
  private resolveSkipDedupeFiles(params: Readonly<IDedupeActionContext>): IScannedFile[] {
    return handleSkippedDuplicates(
      params.filteredFiles,
      params.dedupeGroupCount,
      params.dedupeOutcome.skipped.length,
      params.logger
    );
  }

  /**
   * Resolves files for the REPLACE dedupe action.
   * @param params - Dedupe action context.
   * @returns Files to continue organizing.
   */
  private resolveReplaceDedupeFiles(params: Readonly<IDedupeActionContext>): IScannedFile[] {
    return handleReplacedDuplicates(
      params.filteredFiles,
      params.dedupeOutcome.replaced,
      { deleteDuplicates: params.deleteDuplicates, quarantineDir: params.quarantineDir },
      params.logger
    );
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
