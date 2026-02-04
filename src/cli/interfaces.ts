import type { OrderlyConfig } from '../config/types';
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
  /** Disable auto-discovery of config files in target directory */
  noAutoConfig?: boolean;
}

/**
 * Options for the init command.
 */
export interface IInitOptions {
  /** Config file format (json, yaml) */
  format?: string;
}

/**
 * Options for the scan command.
 */
export interface IScanOptions {
  /** Path to config file */
  config?: string;
  /** Log level (debug, info, warn, error) */
  logLevel?: string;
  /** Disable auto-discovery of config files in target directory */
  noAutoConfig?: boolean;
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
 * Interface for config loading service.
 */
export interface IConfigService {
  /**
   * Loads configuration with command-line option overrides.
   * @param options - Command options that may override config
   * @returns Loaded and merged configuration
   */
  loadWithOverrides(options: IOrganizeOptions): OrderlyConfig;
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
