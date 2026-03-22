import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { FileSystemUtils } from '../../utils/file-system-utils';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
import {
  IAutoConfigContext,
  WithAutoConfigDiscovery
} from '../decorators/auto-config-discovery.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type {
  IOrganizeOptions,
  IOrganizeHandler,
  ICommandResult,
  IConfigService,
  IDirectoryValidator,
  IManifestService
} from '../interfaces';

/**
 * Handler for the organize command.
 */
export class OrganizeHandler implements IOrganizeHandler {
  /**
   * Creates a new OrganizeHandler instance
   * @param configService - Service for loading and managing configuration
   * @param directoryValidator - Service for validating directory paths
   * @param manifestService - Service for generating and saving manifests
   */
  constructor(
    private readonly configService: IConfigService,
    private readonly directoryValidator: IDirectoryValidator,
    private readonly manifestService: IManifestService
  ) {}

  /**
   * Executes the organize command.
   * @param directory - Target directory to organize
   * @param options - Organize command options
   * @param context - Optional context injected by auto-config discovery.
   * @returns Promise resolving to command result
   */
  @WithCommandTelemetry('organize')
  @HandleCommandErrors(COMMAND_MESSAGES.ORGANIZATION_FAILED)
  @WithAutoConfigDiscovery<IOrganizeOptions>()
  async execute(
    directory: string,
    options: IOrganizeOptions,
    context?: IAutoConfigContext<IOrganizeOptions>
  ): Promise<ICommandResult> {
    const targetDir = context?.targetDir ?? this.directoryValidator.validate(directory);
    const configOptions = context?.configOptions ?? { ...options };
    const autoDiscoveredConfig = context?.autoDiscoveredConfig;

    // Load configuration
    const config = this.configService.loadWithOverrides(configOptions);

    // Create logger
    const logger = new Logger(config.logLevel);

    // Log auto-discovered config through the logger so log-level and log-file output are respected
    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }

    // Create services
    const scanner = new FileScanner(config, logger);
    const organizer = new FileOrganizer(config, logger, targetDir);

    // Scan files
    const files = await scanner.scan(targetDir);
    logger.info(COMMAND_MESSAGES.FILES_FOUND.replace('{0}', String(files.length)));

    // Process duplicates if enabled
    let filesToOrganize = files;
    if (config.dedupe?.enabled) {
      filesToOrganize = await this.processDuplicates(files, config, logger);
    }

    // Plan operations
    const operations = organizer.planOperations(filesToOrganize);
    logger.info(COMMAND_MESSAGES.OPERATIONS_PLANNED.replace('{0}', String(operations.length)));

    // Execute operations
    const result = organizer.executeOperations(operations);

    // Generate manifests if requested
    if (options.manifest) {
      this.manifestService.saveManifests(result, targetDir);
      logger.info(COMMAND_MESSAGES.MANIFESTS_GENERATED);
    }

    // Log results
    this.logResults(result, logger);

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.ORGANIZED_SUCCESS.replace('{0}', String(result.operations.length))
    };
  }

  /**
   * Logs the organization results.
   * @param result - Organization result to log
   * @param logger - Logger instance
   */
  private logResults(result: IOrganizationResult, logger: Logger): void {
    logger.info(
      `Operations completed: ${result.successful} successful, ${result.failed} failed, ${result.skipped ?? 0} skipped`
    );

    if (result.errors.length === 0) return;

    logger.warn(`${result.errors.length} errors occurred during organization`);
    result.errors.forEach((error, index) => {
      logger.warn(`  ${index + 1}. ${error.file}: ${error.error}`);
    });
  }

  /**
   * Processes duplicate files according to configuration.
   * @param files - All scanned files
   * @param config - Configuration with dedupe settings
   * @param logger - Logger instance
   * @returns Filtered files to organize
   */
  private async processDuplicates(
    files: IScannedFile[],
    config: OrderlyConfig,
    logger: Logger
  ): Promise<IScannedFile[]> {
    logger.info('Running duplicate detection...');
    const dedupeService = DedupeStrategyFactory.createDedupeService(config.dedupe);

    const dedupeResult = await dedupeService.findDuplicates(files);
    logger.info(
      `Found ${dedupeResult.totalDuplicates} duplicate files in ${dedupeResult.groups.length} groups`
    );

    if (dedupeResult.groups.length === 0) {
      return files;
    }

    const dedupeOutcome = await dedupeService.applyAction(dedupeResult, config.dedupe!.action);
    const affectedFiles = dedupeOutcome.skipped.length + dedupeOutcome.replaced.length;
    logger.info(
      `Dedupe action '${config.dedupe!.action}' applied: ${affectedFiles} files affected`
    );

    const filteredFiles = this.filterDuplicateFiles(
      files,
      dedupeOutcome.skipped,
      dedupeOutcome.replaced
    );

    if (config.dedupe!.action === DedupeAction.SKIP) {
      logger.info(
        `Kept ${dedupeResult.groups.length} primary files, filtered out ${dedupeOutcome.skipped.length} duplicate files`
      );
      return filteredFiles;
    }

    if (config.dedupe!.action === DedupeAction.REPLACE) {
      if (!config.dryRun) {
        for (const file of dedupeOutcome.replaced) {
          FileSystemUtils.unlinkSync(file.originalPath);
        }
      }

      logger.info(
        `${config.dryRun ? 'Would remove' : 'Removed'} ${dedupeOutcome.replaced.length} duplicate files before organization`
      );
      return filteredFiles;
    }

    return files;
  }

  /**
   * Removes duplicate files from the operation set based on dedupe outcome.
   * @param files - All scanned files
   * @param skipped - Files skipped by dedupe
   * @param replaced - Files marked for replacement by dedupe
   * @returns Files that should continue through organization planning
   */
  private filterDuplicateFiles(
    files: IScannedFile[],
    skipped: readonly IScannedFile[],
    replaced: readonly IScannedFile[]
  ): IScannedFile[] {
    const duplicatePaths = new Set([...skipped, ...replaced].map(file => file.originalPath));

    if (duplicatePaths.size === 0) {
      return files;
    }

    return files.filter(file => !duplicatePaths.has(file.originalPath));
  }
}
