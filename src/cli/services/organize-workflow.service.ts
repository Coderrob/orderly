import type { OrderlyConfig } from '../../config/types';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { COMMAND_MESSAGES } from '../constants';
import type { ICleanerService, IManifestService, IOrganizeOptions } from '../interfaces';

import { OrganizeDedupeService } from './organize-dedupe.service';

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
   * @param dedupeRuntime - Shared dedupe runtime helper.
   */
  constructor(
    private readonly manifestService: Readonly<IManifestService>,
    private readonly cleaner?: Readonly<ICleanerService>,
    private readonly organizeDedupeService: Readonly<OrganizeDedupeService> = new OrganizeDedupeService()
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
      ? this.organizeDedupeService.resolveFiles(files, config, logger, options)
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
}
