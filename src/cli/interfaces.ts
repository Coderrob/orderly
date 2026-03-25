import type { IEmptyDirectoryCleaner, ICleanOptions, ICleanResult } from '../cleaner/interfaces';
import type { OrderlyConfig } from '../config/types';
import type { IDedupeReportWriter } from '../dedupe/interfaces';
import type { ILogger } from '../logger/interfaces';
import type { IOrganizationResult } from '../organizer/types';

/**
 * Options for the organize command.
 */
export interface IOrganizeOptions {
  /** Path to config file */
  config?: string;
  /** Preview changes without applying them */
  dryRun?: boolean;
  /** Generate manifest after organization */
  manifest?: boolean;
  /** Log level (debug, info, warn, error) */
  logLevel?: string;
  /** Output directory for organized files */
  output?: string;
  /** Enable duplicate detection */
  dedupe?: boolean;
  /** Action to take on duplicates (skip, report, replace) */
  dedupeAction?: string;
  /** Commander negated option `--no-auto-config` surfaces as `autoConfig: false` */
  autoConfig?: boolean;
  /** Clean empty directories after organization completes */
  cleanEmptyDirs?: boolean;
  /** Explicitly confirm destructive dedupe replace behavior */
  confirmReplace?: boolean;
  /** Move replaced duplicates into a quarantine directory */
  quarantineDir?: string;
}

/**
 * Options for the init command.
 */
export interface IInitOptions {
  /** Config file format (json, yaml) */
  format?: string;
  /** Starter template for generated config */
  template?: string;
}

/**
 * Options for the scan command.
 */
export interface IScanOptions {
  /** Path to config file */
  config?: string;
  /** Log level (debug, info, warn, error) */
  logLevel?: string;
  /** Commander negated option `--no-auto-config` surfaces as `autoConfig: false` */
  autoConfig?: boolean;
  /** Output format for scan results */
  format?: string;
}

/**
 * Options for the clean command.
 */
export interface ICleanCommandOptions extends ICleanOptions {
  /** Path to config file */
  config?: string;
  /** Log level (debug, info, warn, error) */
  logLevel?: string;
  /** Commander negated option `--no-auto-config` surfaces as `autoConfig: false` */
  autoConfig?: boolean;
}

/**
 * Options for the dedupe command.
 */
export interface IDedupeCommandOptions {
  /** Path to config file */
  config?: string;
  /** Log level (debug, info, warn, error) */
  logLevel?: string;
  /** Preview changes without applying them */
  dryRun?: boolean;
  /** Dedupe action override */
  action?: string;
  /** Optional JSON report path */
  reportJson?: string;
  /** Optional Markdown report path */
  reportMarkdown?: string;
  /** Commander negated option `--no-auto-config` surfaces as `autoConfig: false` */
  autoConfig?: boolean;
  /** Require explicit confirmation before destructive replacement */
  confirmReplace?: boolean;
  /** Move replaced files into quarantine instead of deleting them */
  quarantineDir?: string;
  /** Dedupe strategy preset override */
  preset?: string;
}

/**
 * Options for config validation.
 */
export interface IConfigValidateOptions {
  /** Path to config file */
  config?: string;
  /** Directory to search for auto-discovered config files */
  directory?: string;
}

/**
 * Options for manifest-based revert operations.
 */
export interface IRevertCommandOptions {
  /** Path to manifest JSON file */
  manifest: string;
  /** Preview reversal actions without moving files */
  dryRun?: boolean;
}

/**
 * Options for watch mode.
 */
export interface IWatchCommandOptions extends IOrganizeOptions {
  /** Poll interval in seconds */
  interval?: string;
  /** Number of polling cycles before exiting; 0 means continuous */
  cycles?: string;
}

/**
 * Context provided to command handlers.
 */
export interface ICommandContext {
  /** Current working directory */
  cwd: string;
  /** Logger instance */
  logger: ILogger;
  /** Loaded configuration */
  config: OrderlyConfig;
}

/**
 * Result of a command execution.
 */
export interface ICommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Exit code for the process */
  exitCode: number;
  /** Optional message to display */
  message?: string;
}

/**
 * Interface for CLI command handlers.
 */
export interface ICommandHandler<TOptions = unknown> {
  /**
   * Executes the command with the given options.
   * @param directory - Target directory for the command
   * @param options - Command-specific options
   * @returns Promise resolving to the command result
   */
  execute(directory: string, options: TOptions): Promise<ICommandResult>;
}

/**
 * Interface for the organize command handler.
 */
export interface IOrganizeHandler extends ICommandHandler<IOrganizeOptions> {
  execute(directory: string, options: IOrganizeOptions): Promise<ICommandResult>;
}

/**
 * Interface for the scan command handler.
 */
export interface IScanHandler extends ICommandHandler<IScanOptions> {
  execute(directory: string, options: IScanOptions): Promise<ICommandResult>;
}

/**
 * Interface for the init command handler.
 */
export interface IInitHandler {
  /**
   * Executes the init command.
   * @param options - Init command options
   * @returns Promise resolving to the command result
   */
  execute(options: IInitOptions): Promise<ICommandResult>;
}

/**
 * Interface for the config validation command handler.
 */
export interface IConfigValidateHandler {
  /**
   * Executes the config validation command.
   * @param options - Validate command options.
   * @returns Promise resolving to the command result.
   */
  execute(options: IConfigValidateOptions): Promise<ICommandResult>;
}

/**
 * Interface for the clean command handler.
 */
export interface ICleanHandler {
  /**
   * Executes the clean command.
   * @param directory - Target directory for the command
   * @param options - Clean command options
   * @returns Promise resolving to the command result
   */
  execute(directory: string, options: ICleanCommandOptions): Promise<ICommandResult>;
}

/**
 * Interface for the dedupe command handler.
 */
export interface IDedupeHandler {
  /**
   * Executes the dedupe command.
   * @param directory - Target directory for the command
   * @param options - Dedupe command options
   * @returns Promise resolving to the command result
   */
  execute(directory: string, options: IDedupeCommandOptions): Promise<ICommandResult>;
}

/**
 * Interface for the revert command handler.
 */
export interface IRevertHandler {
  /**
   * Executes the revert command.
   * @param options - Revert command options.
   * @returns Promise resolving to the command result.
   */
  execute(options: IRevertCommandOptions): Promise<ICommandResult>;
}

/**
 * Interface for the watch command handler.
 */
export interface IWatchHandler {
  /**
   * Executes the watch command.
   * @param directory - Target directory.
   * @param options - Watch command options.
   * @returns Promise resolving to the command result.
   */
  execute(directory: string, options: IWatchCommandOptions): Promise<ICommandResult>;
}

/**
 * Interface for config loading service.
 */
export interface IConfigService {
  /**
   * Loads configuration with command-line option overrides.
   * @param options - Command options that may override config
   * @returns Loaded and merged configuration
   */
  loadWithOverrides(options: IOrganizeOptions): OrderlyConfig;

  /**
   * Searches for a config file in the target directory.
   * @param directory - Directory to search in
   * @returns Path to config file if found, null otherwise
   */
  findConfigInDirectory(directory: string): string | null;
}

/**
 * Interface for directory validation service.
 */
export interface IDirectoryValidator {
  /**
   * Validates that a directory exists and is accessible.
   * @param directory - Directory path to validate
   * @returns Resolved absolute path if valid
   * @throws Error if directory doesn't exist
   */
  validate(directory: string): string;
}

/**
 * Interface for manifest generation service.
 */
export interface IManifestService {
  /**
   * Generates and saves manifest files for an organization result.
   * @param result - Organization result to generate manifest for
   * @param outputDir - Directory to save manifest files
   */
  saveManifests(result: IOrganizationResult, outputDir: string): void;
}

/**
 * Interface for empty-directory cleaning service.
 */
export interface ICleanerService extends IEmptyDirectoryCleaner {
  clean(rootDirectory: string, options: Readonly<ICleanOptions>): ICleanResult;
}

/**
 * Interface for dedupe report generation service.
 */
export type IDedupeReportService = IDedupeReportWriter;
