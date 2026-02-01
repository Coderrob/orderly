import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import type { IScannedFile } from '../../scanner/interfaces';
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
   *
   * @param configService
   * @param directoryValidator
   * @param manifestService
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
      // Load configuration
      const config = this.configService.loadWithOverrides(options);

      // Validate and resolve directory
      const targetDir = this.directoryValidator.validate(directory);

      // Create logger
      const logger = new Logger(config.logLevel);

      // Create services
      const scanner = new FileScanner(config, logger);
      const organizer = new FileOrganizer(config, logger, targetDir);

      // Scan files
      const files = await scanner.scan(targetDir);
      logger.info(`Found ${files.length} files to process`);

      // Process duplicates if enabled
      let filesToOrganize = files;
      if (config.dedupe?.enabled) {
        filesToOrganize = await this.processDuplicates(files, config, logger);
      }

      // Plan operations
      const operations = organizer.planOperations(filesToOrganize);
      logger.info(`Planned ${operations.length} operations`);

      // Execute operations
      const result = organizer.executeOperations(operations);

      // Generate manifests if requested
      if (options.manifest) {
        this.manifestService.saveManifests(result, targetDir);
        logger.info('Manifests generated');
      }

      // Log results
      this.logResults(result, logger);

      return {
        success: true,
        exitCode: 0,
        message: `Successfully organized ${result.operations.length} files`
      };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        message: `Organization failed: ${error instanceof Error ? error.message : String(error)}`
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
      const duplicatePaths = new Set(
        dedupeResult.groups.flatMap(group => group.files.map(f => f.originalPath))
      );
      const filteredFiles = files.filter(file => !duplicatePaths.has(file.originalPath));
      logger.info(`Filtered out ${files.length - filteredFiles.length} duplicate files`);
      return filteredFiles;
    }

    return files;
  }
}
