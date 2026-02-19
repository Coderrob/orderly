import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
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
   * @returns Promise resolving to command result
   */
  async execute(directory: string, options: IOrganizeOptions): Promise<ICommandResult> {
    try {
      // Validate and resolve directory first
      const targetDir = this.directoryValidator.validate(directory);

      // If no config specified and auto-discovery not disabled, check target directory for config file
      const configOptions = { ...options };
      if (!configOptions.config && !options.noAutoConfig) {
        const targetConfig = this.configService.findConfigInDirectory(targetDir);
        if (targetConfig) {
          configOptions.config = targetConfig;
          // Log that we're using an auto-discovered config
          console.log(`ℹ️  ${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${targetConfig}\n`);
        }
      }

      // Load configuration
      const config = this.configService.loadWithOverrides(configOptions);

      // Create logger
      const logger = new Logger(config.logLevel);

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
    } catch (error) {
      return {
        success: false,
        exitCode: ExitCode.ERROR,
        message: `${COMMAND_MESSAGES.ORGANIZATION_FAILED}${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Logs the organization results.
   * @param result - Organization result to log
   * @param logger - Logger instance
   */
  private logResults(result: IOrganizationResult, logger: Logger): void {
    logger.info(`Operations completed: ${result.successful} successful, ${result.failed} failed`);

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
    const dedupeService = DedupeStrategyFactory.createDedupeService();

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

    // Filter out duplicates based on action
    if (config.dedupe!.action === DedupeAction.SKIP) {
      // Keep only primary files from duplicate groups, remove all duplicates
      const duplicatePaths = new Set(
        dedupeResult.groups.flatMap(group => group.files.slice(1).map(f => f.originalPath))
      );
      const filteredFiles = files.filter(file => !duplicatePaths.has(file.originalPath));
      logger.info(
        `Kept ${dedupeResult.groups.length} primary files, filtered out ${duplicatePaths.size} duplicate files`
      );
      return filteredFiles;
    }

    return files;
  }
}
