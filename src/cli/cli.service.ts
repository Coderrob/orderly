import * as path from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import { ConfigLoader } from '../config/config-loader';
import { DEFAULT_CONFIG, OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileOrganizer } from '../organizer/file-organizer';
import type { IOrganizationResult } from '../organizer/types';
import { FileScanner } from '../scanner/file-scanner';
import type { IScannedFile } from '../scanner/interfaces';
import { LogLevel } from '../types';
import { FileSystemUtils } from '../utils/file-system-utils';

import {
  displayScanResults,
  logFileSummary,
  logResults,
  saveManifests
} from './cli.service.helpers';
import {
  CLI_CONSTANTS,
  COMMAND_MESSAGES,
  CONFIG_FILE_NAMES,
  ConfigFileFormat,
  ExitCode
} from './constants';
import { HandleCliActionErrors } from './decorators/cli-action-error-handler.decorator';
import { WithCliAutoConfigDiscovery } from './decorators/cli-auto-config-discovery.decorator';
import type { IInitOptions, IOrganizeOptions, IScanOptions } from './interfaces';

const ORGANIZE_BANNER = `\n🗂️  ${CLI_CONSTANTS.TOOL_NAME} - File Organization Tool\n`;
const SCAN_BANNER = '\n🔍 Scanning directory...\n';
const ORGANIZE_COMPLETE_MESSAGE = '\n✨ Organization complete!\n';
const SCAN_COMPLETE_MESSAGE = '\n✨ Scan complete!\n';
const ALL_FILES_ORGANIZED_MESSAGE = '\n✓ All files are already organized!';
const NO_FILES_TO_ORGANIZE_MESSAGE = 'No files found to organize';
const NO_FILES_FOUND_MESSAGE = 'No files found';
const DRY_RUN_WARNING = 'Running in DRY RUN mode - no files will be modified';
const JSON_CONFIG_FORMAT = 'json';
const YAML_CONFIG_FORMAT = 'yaml';
const YML_CONFIG_FORMAT = 'yml';

/**
 * Service class for handling CLI operations.
 * Separates business logic from command parsing.
 */
export class CliService {
  private readonly program = new Command();

  /**
   * Creates the CLI service and registers all available commands.
   */
  constructor() {
    this.setupProgram();
  }

  /**
   * Sets up the commander program with all commands.
   */
  private setupProgram(): void {
    this.program.name('orderly').description(CLI_CONSTANTS.TOOL_DESCRIPTION).version('1.0.0');
    this.setupOrganizeCommand();
    this.setupInitCommand();
    this.setupScanCommand();
  }

  /**
   * Sets up the organize command.
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
      .action(this.onOrganizeCommand.bind(this));
  }

  /**
   * Sets up the init command.
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
      .action(this.onInitCommand.bind(this));
  }

  /**
   * Sets up the scan command.
   */
  private setupScanCommand(): void {
    this.program
      .command('scan')
      .description('Scan a directory and show what would be organized')
      .argument('[directory]', 'Directory to scan', '.')
      .option('-c, --config <path>', 'Path to config file')
      .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
      .option('--no-auto-config', 'Disable auto-discovery of config files in target directory')
      .action(this.onScanCommand.bind(this));
  }

  /**
   * Runs the organize command action callback.
   * @param directory - Directory argument provided by commander.
   * @param options - Parsed organize command options.
   * @returns A promise that resolves when the command completes.
   */
  private async onOrganizeCommand(
    directory: string,
    options: Readonly<IOrganizeOptions>
  ): Promise<void> {
    await this.handleOrganizeCommand(directory, options);
  }

  /**
   * Runs the init command action callback.
   * @param options - Parsed init command options.
   */
  private onInitCommand(options: Readonly<IInitOptions>): void {
    this.handleInitCommand(options);
  }

  /**
   * Runs the scan command action callback.
   * @param directory - Directory argument provided by commander.
   * @param options - Parsed scan command options.
   * @returns A promise that resolves when the command completes.
   */
  private async onScanCommand(directory: string, options: Readonly<IScanOptions>): Promise<void> {
    await this.handleScanCommand(directory, options);
  }

  /**
   * Parses the command line arguments.
   */
  parse(): void {
    this.program.parse();
  }

  /**
   * Handles the organize command.
   * @param directory - Target directory passed from the CLI.
   * @param options - Parsed organize command options.
   * @param autoDiscoveredConfig - Config path discovered automatically for the target directory, when present.
   * @returns A promise that resolves when organize handling completes.
   */
  @HandleCliActionErrors()
  @WithCliAutoConfigDiscovery<IOrganizeOptions>()
  private async handleOrganizeCommand(
    directory: string,
    options: Readonly<IOrganizeOptions>,
    autoDiscoveredConfig?: string
  ): Promise<void> {
    const context = this.prepareOrganizeRun(directory, options, autoDiscoveredConfig);
    const files = await this.scanFiles(context.targetDir, context.config, context.logger);
    if (files.length === 0) {
      context.logger.info(NO_FILES_TO_ORGANIZE_MESSAGE);
      return;
    }

    logFileSummary(this.createScanner(context.config, context.logger), files, context.logger);

    const result = this.runOrganization(context.config, context.logger, context.targetDir, files);
    if (!result) return;

    this.finalizeOrganization(result, context.config, context.logger);
  }

  /**
   * Handles the init command.
   * @param options - Parsed init command options.
   */
  @HandleCliActionErrors()
  private handleInitCommand(options: Readonly<IInitOptions>): void {
    const format = this.validateFormat(options.format);
    const filename =
      format === ConfigFileFormat.JSON ? CONFIG_FILE_NAMES.JSON : CONFIG_FILE_NAMES.YAML;
    const configPath = path.join(process.cwd(), filename);

    if (FileSystemUtils.hasPath(configPath)) {
      console.error(chalk.red(`Config file already exists: ${configPath}`));
      process.exit(ExitCode.ERROR);
    }

    ConfigLoader.save(DEFAULT_CONFIG, configPath);
    console.log(chalk.green(`✓ Created config file: ${configPath}`));
  }

  /**
   * Handles the scan command.
   * @param directory - Target directory passed from the CLI.
   * @param options - Parsed scan command options.
   * @param autoDiscoveredConfig - Config path discovered automatically for the target directory, when present.
   * @returns A promise that resolves when scan handling completes.
   */
  @HandleCliActionErrors()
  @WithCliAutoConfigDiscovery<IScanOptions>()
  private async handleScanCommand(
    directory: string,
    options: Readonly<IScanOptions>,
    autoDiscoveredConfig?: string
  ): Promise<void> {
    const context = this.prepareScanRun(directory, options, autoDiscoveredConfig);
    const files = await context.scanner.scan(context.targetDir);
    if (files.length === 0) {
      context.logger.info(NO_FILES_FOUND_MESSAGE);
      return;
    }

    displayScanResults({ ...context, files });
    this.showBanner(SCAN_COMPLETE_MESSAGE);
  }

  /**
   * Prepares shared organize command state before file processing begins.
   * @param directory - Target directory passed from the CLI.
   * @param options - Parsed organize command options.
   * @param autoDiscoveredConfig - Config path discovered automatically for the target directory, when present.
   * @returns Shared organize command execution context.
   */
  private prepareOrganizeRun(
    directory: string,
    options: Readonly<IOrganizeOptions>,
    autoDiscoveredConfig?: string
  ): Readonly<{ config: OrderlyConfig; logger: Readonly<Logger>; targetDir: string }> {
    const config = this.loadConfig(options);
    const logger = this.createLogger(config.logLevel);

    this.logAutoDiscoveredConfig(logger, autoDiscoveredConfig);
    this.showBanner(ORGANIZE_BANNER);

    const targetDir = this.validateDirectory(directory, logger);
    this.logConfiguration(targetDir, config, logger);
    return { config, logger, targetDir };
  }

  /**
   * Prepares shared scan command state before file scanning begins.
   * @param directory - Target directory passed from the CLI.
   * @param options - Parsed scan command options.
   * @param autoDiscoveredConfig - Config path discovered automatically for the target directory, when present.
   * @returns Shared scan command execution context.
   */
  private prepareScanRun(
    directory: string,
    options: Readonly<IScanOptions>,
    autoDiscoveredConfig?: string
  ): Readonly<{
    config: OrderlyConfig;
    logger: Readonly<Logger>;
    scanner: Readonly<FileScanner>;
    targetDir: string;
  }> {
    const config = this.loadScanConfig(options);
    const logger = this.createLogger(config.logLevel);

    this.logAutoDiscoveredConfig(logger, autoDiscoveredConfig);
    this.showBanner(SCAN_BANNER);

    const targetDir = this.validateDirectory(directory, logger);
    const scanner = this.createScanner(config, logger);
    return { config, logger, scanner, targetDir };
  }

  /**
   * Loads configuration with overrides from organize options.
   * @param options - Parsed organize command options containing config overrides.
   * @returns The loaded configuration with CLI overrides applied.
   */
  private loadConfig(options: Readonly<IOrganizeOptions>): OrderlyConfig {
    const config = ConfigLoader.load(options.config);
    const logLevel = this.resolveLogLevel(options.logLevel);
    const targetDirectory = options.output ? path.resolve(options.output) : config.targetDirectory;

    return {
      ...config,
      dryRun: options.dryRun || config.dryRun,
      generateManifest: options.manifest ?? config.generateManifest,
      logLevel: logLevel ?? config.logLevel,
      ...(targetDirectory ? { targetDirectory } : {})
    };
  }

  /**
   * Loads configuration for scan execution.
   * @param options - Parsed scan command options.
   * @returns The loaded configuration with scan overrides applied.
   */
  private loadScanConfig(options: Readonly<IScanOptions>): OrderlyConfig {
    const config = ConfigLoader.load(options.config);
    const logLevel = this.resolveLogLevel(options.logLevel);

    return {
      ...config,
      dryRun: true,
      logLevel: logLevel ?? config.logLevel
    };
  }

  /**
   * Resolves a log level string to a supported enum value.
   * @param logLevel - Raw log level string from CLI input.
   * @returns The matching log level, or undefined when unsupported.
   */
  private resolveLogLevel(logLevel?: string): LogLevel | undefined {
    switch (logLevel) {
      case LogLevel.DEBUG:
        return LogLevel.DEBUG;
      case LogLevel.INFO:
        return LogLevel.INFO;
      case LogLevel.WARN:
        return LogLevel.WARN;
      case LogLevel.ERROR:
        return LogLevel.ERROR;
      default:
        return undefined;
    }
  }

  /**
   * Creates a logger instance.
   * @param logLevel - Minimum log level to use for this command execution.
   * @returns A logger configured to write to the orderly log file.
   */
  private createLogger(logLevel: string): Logger {
    const resolvedLevel = this.resolveLogLevel(logLevel) ?? LogLevel.INFO;
    const logFile = path.join(process.cwd(), CLI_CONSTANTS.ORDERLY_DIR, CLI_CONSTANTS.LOG_FILE);
    return new Logger(resolvedLevel, logFile);
  }

  /**
   * Creates a scanner for the provided configuration.
   * @param config - Configuration used by the scanner.
   * @param logger - Logger used by the scanner.
   * @returns A configured file scanner instance.
   */
  private createScanner(config: Readonly<OrderlyConfig>, logger: Readonly<Logger>): FileScanner {
    return new FileScanner(config, logger);
  }

  /**
   * Scans the target directory using the provided configuration.
   * @param targetDir - Resolved target directory path.
   * @param config - Configuration used for scanning.
   * @param logger - Logger used for scanner output.
   * @returns The scanned files.
   */
  private async scanFiles(
    targetDir: string,
    config: Readonly<OrderlyConfig>,
    logger: Readonly<Logger>
  ): Promise<IScannedFile[]> {
    return this.createScanner(config, logger).scan(targetDir);
  }

  /**
   * Plans and executes organization work for the provided files.
   * @param config - Configuration used for organization.
   * @param logger - Logger used for organization output.
   * @param targetDir - Resolved target directory path.
   * @param files - Files selected for organization.
   * @returns The organization result, or null when no work was required.
   */
  private runOrganization(
    config: Readonly<OrderlyConfig>,
    logger: Readonly<Logger>,
    targetDir: string,
    files: readonly IScannedFile[]
  ): IOrganizationResult | null {
    const organizer = new FileOrganizer(config, logger, targetDir);
    const operations = organizer.planOperations(files);
    if (operations.length === 0) {
      logger.info(ALL_FILES_ORGANIZED_MESSAGE);
      return null;
    }

    logger.info(`\nPlanned operations: ${operations.length}`);
    return organizer.executeOperations(operations);
  }

  /**
   * Finalizes organization output and exit behavior.
   * @param result - Organization result to report.
   * @param config - Configuration used during organization.
   * @param logger - Logger used for status output.
   */
  private finalizeOrganization(
    result: Readonly<IOrganizationResult>,
    config: Readonly<OrderlyConfig>,
    logger: Readonly<Logger>
  ): void {
    logResults(result, logger);
    if (config.generateManifest && !config.dryRun) {
      saveManifests(result, logger);
    }

    this.showBanner(ORGANIZE_COMPLETE_MESSAGE);
    if (result.failed > 0) {
      process.exit(ExitCode.ERROR);
    }
  }

  /**
   * Logs the auto-discovered config path when one is present.
   * @param logger - Logger used for status output.
   * @param autoDiscoveredConfig - Auto-discovered config path, when present.
   */
  private logAutoDiscoveredConfig(logger: Readonly<Logger>, autoDiscoveredConfig?: string): void {
    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }
  }

  /**
   * Displays a command banner or completion message.
   * @param message - Banner text to print to stdout.
   */
  private showBanner(message: string): void {
    console.log(chalk.blue.bold(message));
  }

  /**
   * Validates and resolves a directory path.
   * @param directory - Directory path provided by the user.
   * @param logger - Logger used to report validation failures.
   * @returns The resolved absolute directory path.
   */
  private validateDirectory(directory: string, logger: Readonly<Logger>): string {
    const targetDir = path.resolve(directory);
    if (!FileSystemUtils.hasPath(targetDir)) {
      logger.error(`Directory does not exist: ${targetDir}`);
      process.exit(ExitCode.ERROR);
    }

    return targetDir;
  }

  /**
   * Logs configuration information.
   * @param targetDir - Resolved target directory being processed.
   * @param config - Active configuration for the command.
   * @param logger - Logger used for status output.
   */
  private logConfiguration(
    targetDir: string,
    config: Readonly<OrderlyConfig>,
    logger: Readonly<Logger>
  ): void {
    logger.info(`Target directory: ${targetDir}`);
    if (config.dryRun) {
      logger.warn(DRY_RUN_WARNING);
    }
  }

  /**
   * Validates the config format.
   * @param format - Optional format provided from the CLI.
   * @returns The normalized config format.
   */
  private validateFormat(format?: string): ConfigFileFormat {
    const normalized = (format ?? CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT).toLowerCase();
    switch (normalized) {
      case JSON_CONFIG_FORMAT:
        return ConfigFileFormat.JSON;
      case YAML_CONFIG_FORMAT:
      case YML_CONFIG_FORMAT:
        return ConfigFileFormat.YAML;
      default:
        console.error(
          chalk.red(`Invalid format. Use ${CLI_CONSTANTS.VALID_FORMATS.join(' or ')}.`)
        );
        process.exit(ExitCode.ERROR);
    }
  }
}
