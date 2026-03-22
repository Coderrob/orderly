import * as path from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import { ConfigLoader } from '../config/config-loader';
import { DEFAULT_CONFIG, OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileOrganizer } from '../organizer/file-organizer';
import { ManifestGenerator } from '../organizer/manifest-generator';
import { FileOperationType, type IOrganizationResult } from '../organizer/types';
import { FileScanner } from '../scanner/file-scanner';
import type { IScannedFile } from '../scanner/interfaces';
import { LogLevel } from '../types';
import { FileSystemUtils } from '../utils/file-system-utils';

import { CLI_CONSTANTS, ExitCode, CONFIG_FILE_NAMES, COMMAND_MESSAGES } from './constants';
import { HandleCliActionErrors } from './decorators/cli-action-error-handler.decorator';
import { WithCliAutoConfigDiscovery } from './decorators/cli-auto-config-discovery.decorator';
import type { IOrganizeOptions, IInitOptions, IScanOptions } from './interfaces';

/**
 * Service class for handling CLI operations.
 * Separates business logic from command parsing.
 */
export class CliService {
  private readonly program: Command;

  /**
   * Creates the CLI service and registers all available commands.
   */
  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  /**
   * Sets up the commander program with all commands
   */
  private setupProgram(): void {
    this.program.name('orderly').description(CLI_CONSTANTS.TOOL_DESCRIPTION).version('1.0.0');

    this.setupOrganizeCommand();
    this.setupInitCommand();
    this.setupScanCommand();
  }

  /**
   * Sets up the organize command
   */
  private setupOrganizeCommand(): void {
    this.program
      .command('organize')
      .description('Organize files in a directory')
      .argument('[directory]', 'Directory to organize', '.')
      .option('-c, --config <path>', 'Path to config file')
      .option('-d, --dry-run', 'Preview changes without applying them')
      .option('--no-manifest', 'Skip manifest generation')
      .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
      .option('-o, --output <path>', 'Output directory for organized files')
      .option('--no-auto-config', 'Disable auto-discovery of config files in target directory')
      .action(async (directory: string, options: IOrganizeOptions) => {
        await this.handleOrganizeCommand(directory, options);
      });
  }

  /**
   * Sets up the init command
   */
  private setupInitCommand(): void {
    this.program
      .command('init')
      .description('Initialize a new configuration file')
      .option(
        '-f, --format <format>',
        `Config file format (${CLI_CONSTANTS.VALID_FORMATS.join(', ')})`,
        CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT
      )
      .action((options: IInitOptions) => {
        this.handleInitCommand(options);
      });
  }

  /**
   * Sets up the scan command
   */
  private setupScanCommand(): void {
    this.program
      .command('scan')
      .description('Scan a directory and show what would be organized')
      .argument('[directory]', 'Directory to scan', '.')
      .option('-c, --config <path>', 'Path to config file')
      .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
      .option('--no-auto-config', 'Disable auto-discovery of config files in target directory')
      .action(async (directory: string, options: IScanOptions) => {
        await this.handleScanCommand(directory, options);
      });
  }

  /**
   * Parses the command line arguments
   */
  parse(): void {
    this.program.parse();
  }

  /**
   * Handles the organize command
   * @param directory - Target directory passed from the CLI.
   * @param options - Parsed organize command options.
   * @param autoDiscoveredConfig - Config path discovered automatically for the target directory, when present.
   */
  @HandleCliActionErrors()
  @WithCliAutoConfigDiscovery<IOrganizeOptions>()
  private async handleOrganizeCommand(
    directory: string,
    options: IOrganizeOptions,
    autoDiscoveredConfig?: string
  ): Promise<void> {
    const config = this.loadConfig(options);
    const logger = this.createLogger(config.logLevel);

    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }

    console.log(chalk.blue.bold(`\n🗂️  ${CLI_CONSTANTS.TOOL_NAME} - File Organization Tool\n`));

    const targetDir = this.validateDirectory(directory, logger);
    this.logConfiguration(targetDir, config.dryRun, logger);

    const scanner = new FileScanner(config, logger);
    const files = await scanner.scan(targetDir);

    if (files.length === 0) {
      logger.info('No files found to organize');
      return;
    }

    this.logFileSummary(scanner, files, logger);

    const organizer = new FileOrganizer(config, logger, targetDir);
    const operations = organizer.planOperations(files);

    if (operations.length === 0) {
      logger.info('\n✓ All files are already organized!');
      return;
    }

    logger.info(`\nPlanned operations: ${operations.length}`);
    const result = organizer.executeOperations(operations);

    this.logResults(result, logger);

    if (config.generateManifest && !config.dryRun) {
      this.saveManifests(result, logger);
    }

    console.log(chalk.blue.bold('\n✨ Organization complete!\n'));

    if (result.failed > 0) {
      process.exit(ExitCode.ERROR);
    }
  }

  /**
   * Handles the init command
   * @param options - Parsed init command options.
   */
  @HandleCliActionErrors()
  private handleInitCommand(options: IInitOptions): void {
    const format = this.validateFormat(options.format);
    const filename = this.getFilename(format);
    const configPath = path.join(process.cwd(), filename);

    if (FileSystemUtils.existsSync(configPath)) {
      console.error(chalk.red(`Config file already exists: ${configPath}`));
      process.exit(ExitCode.ERROR);
    }

    ConfigLoader.save(DEFAULT_CONFIG, configPath);
    console.log(chalk.green(`✓ Created config file: ${configPath}`));
  }

  /**
   * Handles the scan command
   * @param directory - Target directory passed from the CLI.
   * @param options - Parsed scan command options.
   * @param autoDiscoveredConfig - Config path discovered automatically for the target directory, when present.
   */
  @HandleCliActionErrors()
  @WithCliAutoConfigDiscovery<IScanOptions>()
  private async handleScanCommand(
    directory: string,
    options: IScanOptions,
    autoDiscoveredConfig?: string
  ): Promise<void> {
    const config = ConfigLoader.load(options.config);
    config.dryRun = true;
    if (options.logLevel) config.logLevel = options.logLevel as LogLevel;

    const logger = new Logger(config.logLevel);

    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }

    console.log(chalk.blue.bold('\n🔍 Scanning directory...\n'));

    const targetDir = this.validateDirectory(directory, logger);
    const scanner = new FileScanner(config, logger);
    const files = await scanner.scan(targetDir);

    if (files.length === 0) {
      logger.info('No files found');
      return;
    }

    this.displayScanResults(scanner, files, config, logger, targetDir);
    console.log(chalk.blue.bold('\n✨ Scan complete!\n'));
  }

  /**
   * Loads configuration with overrides from options
   * @param options - Parsed organize command options containing config overrides.
   * @returns The loaded configuration with CLI overrides applied.
   */
  private loadConfig(options: IOrganizeOptions): OrderlyConfig {
    const config = ConfigLoader.load(options.config);
    if (options.dryRun) config.dryRun = true;
    if (!options.manifest) config.generateManifest = false;
    if (options.logLevel) config.logLevel = options.logLevel as LogLevel;
    if (options.output) config.targetDirectory = path.resolve(options.output);
    return config;
  }

  /**
   * Creates a logger instance
   * @param logLevel - Minimum log level to use for this command execution.
   * @returns A logger configured to write to the orderly log file.
   */
  private createLogger(logLevel: string): Logger {
    const logFile = path.join(process.cwd(), CLI_CONSTANTS.ORDERLY_DIR, CLI_CONSTANTS.LOG_FILE);
    return new Logger(logLevel as LogLevel, logFile);
  }

  /**
   * Finds the first supported config file in the provided directory.
   * @param directory - Directory to search for supported config filenames.
   * @returns The first matching config file path, or null when none is found.
   */
  private findConfigInDirectory(directory: string): string | null {
    const targetDirectory = path.resolve(directory);

    for (const configFile of Object.values(CONFIG_FILE_NAMES)) {
      const candidatePath = path.join(targetDirectory, configFile);
      if (FileSystemUtils.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    return null;
  }

  /**
   * Validates and resolves a directory path
   * @param directory - Directory path provided by the user.
   * @param logger - Logger used to report validation failures.
   * @returns The resolved absolute directory path.
   */
  private validateDirectory(directory: string, logger: Logger): string {
    const targetDir = path.resolve(directory);
    if (!FileSystemUtils.existsSync(targetDir)) {
      logger.error(`Directory does not exist: ${targetDir}`);
      process.exit(ExitCode.ERROR);
    }
    return targetDir;
  }

  /**
   * Logs configuration information
   * @param targetDir - Resolved target directory being processed.
   * @param dryRun - Whether the current command is running without modifying files.
   * @param logger - Logger used for status output.
   */
  private logConfiguration(targetDir: string, dryRun: boolean, logger: Logger): void {
    logger.info(`Target directory: ${targetDir}`);
    if (dryRun) {
      logger.warn('Running in DRY RUN mode - no files will be modified');
    }
  }

  /**
   * Logs file summary information
   * @param scanner - Scanner used to compute category summaries.
   * @param files - Files returned from the scan operation.
   * @param logger - Logger used for status output.
   */
  private logFileSummary(scanner: FileScanner, files: IScannedFile[], logger: Logger): void {
    const summary = scanner.getCategorySummary(files);
    logger.info('\nFile categories found:');
    for (const [category, count] of summary) {
      logger.info(`  ${category}: ${count} files`);
    }
  }

  /**
   * Logs organization results
   * @param result - Organization result to summarize.
   * @param logger - Logger used for status output.
   */
  private logResults(result: IOrganizationResult, logger: Logger): void {
    logger.info(`\n${'='.repeat(50)}`);
    logger.info(chalk.green.bold(`✓ Completed: ${result.successful} operations`));
    if (result.failed > 0) {
      logger.error(chalk.red.bold(`✗ Failed: ${result.failed} operations`));
    }
  }

  /**
   * Saves manifest files
   * @param result - Organization result used to generate manifests.
   * @param logger - Logger used for status output.
   */
  private saveManifests(result: IOrganizationResult, logger: Logger): void {
    const manifestGenerator = new ManifestGenerator(logger);
    const manifest = manifestGenerator.generate(result, result.errors);

    const manifestDir = path.join(process.cwd(), CLI_CONSTANTS.ORDERLY_DIR);
    manifestGenerator.save(manifest, path.join(manifestDir, CLI_CONSTANTS.MANIFEST_JSON));
    manifestGenerator.saveMarkdown(manifest, path.join(manifestDir, CLI_CONSTANTS.MANIFEST_MD));

    logger.info(`\nManifest files created in: ${manifestDir}`);
  }

  /**
   * Validates the config format
   * @param format
   * @returns The normalized config format string.
   */
  private validateFormat(format?: string): string {
    const normalized = (format || CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT).toLowerCase();
    const validFormats = CLI_CONSTANTS.VALID_FORMATS.map(f => f.toLowerCase());
    if (!validFormats.includes(normalized)) {
      console.error(
        chalk.red(
          `Invalid format. Use ${CLI_CONSTANTS.VALID_FORMATS.map(f => f.toLowerCase()).join(' or ')}.`
        )
      );
      process.exit(ExitCode.ERROR);
    }
    return normalized;
  }

  /**
   * Gets the filename for a config format
   * @param format
   * @returns The default config filename for the requested format.
   */
  private getFilename(format: string): string {
    return format === 'json' ? CONFIG_FILE_NAMES.JSON : CONFIG_FILE_NAMES.YAML;
  }

  /**
   * Displays scan results
   * @param scanner - Scanner used to compute category summaries.
   * @param files - Files returned from the scan operation.
   * @param config - Configuration that would be used for organization.
   * @param logger - Logger passed to the organizer preview.
   * @param targetDir - Resolved target directory being scanned.
   */
  private displayScanResults(
    scanner: FileScanner,
    files: IScannedFile[],
    config: OrderlyConfig,
    logger: Logger,
    targetDir: string
  ): void {
    const summary = scanner.getCategorySummary(files);
    console.log(chalk.bold('\nFile categories:'));
    for (const [category, count] of summary) {
      console.log(`  ${chalk.cyan(category)}: ${count} files`);
    }

    const organizer = new FileOrganizer(config, logger, targetDir);
    const operations = organizer.planOperations(files);
    console.log(chalk.bold(`\nOperations needed: ${operations.length}`));

    const operationTypes = {
      [FileOperationType.MOVE]: 0,
      [FileOperationType.RENAME]: 0,
      [FileOperationType.MOVE_RENAME]: 0
    };
    for (const op of operations) {
      operationTypes[op.type]++;
    }

    console.log(`  Move: ${operationTypes[FileOperationType.MOVE]}`);
    console.log(`  Rename: ${operationTypes[FileOperationType.RENAME]}`);
    console.log(`  Move + Rename: ${operationTypes[FileOperationType.MOVE_RENAME]}`);
  }

  /**
   * Handles and displays errors
   * @param error - Error thrown during command execution.
   */
  private handleError(error: unknown): void {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(ExitCode.ERROR);
  }
}
