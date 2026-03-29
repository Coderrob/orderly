import { Logger } from '../../logger/logger';
import { COMMAND_MESSAGES, ExitCode } from '../constants';
import {
  IAutoConfigContext
} from '../decorators/auto-config-discovery.decorator';
import type {
  ICleanCommandOptions,
  ICleanHandler,
  ICleanerService,
  IConfigService,
  ICommandResult,
  IDirectoryValidator
} from '../interfaces';

import { createMappedCommandContextBase } from './command-context.helpers';
import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';
import {
  createWrappedAutoConfigCommand
} from './command-wrapper.helpers';

enum CleanOptionKey {
  AUTO_CONFIG = 'autoConfig',
  CONFIG = 'config',
  DRY_RUN = 'dryRun',
  INCLUDE_HIDDEN = 'includeHidden',
  LOG_LEVEL = 'logLevel',
  REMOVE_ORDERLY_DIR = 'removeOrderlyDir'
}

interface ICleanContextDependencies {
  readonly configService: Readonly<IConfigService>;
  readonly directoryValidator: Readonly<IDirectoryValidator>;
}

interface ICleanExecuteDependencies extends ICleanContextDependencies {
  executeCore(
    directory: string,
    options: Readonly<ICleanCommandOptions>,
    context?: Readonly<IAutoConfigContext<ICleanCommandOptions>>
  ): Promise<ICommandResult>;
}

/**
 * Handler for the clean command.
 */
export class CleanHandler implements ICleanHandler {
  public readonly execute: (
    directory: string,
    options: Readonly<ICleanCommandOptions>,
    context?: Readonly<IAutoConfigContext<ICleanCommandOptions>>
  ) => Promise<ICommandResult>;

  /**
   * Creates a new clean command handler.
   * @param cleaner - Empty-directory cleaner service.
   * @param configService - Config loading service.
   * @param directoryValidator - Directory validation service.
   */
  constructor(
    private readonly cleaner: Readonly<ICleanerService>,
    readonly configService: Readonly<IConfigService>,
    readonly directoryValidator: Readonly<IDirectoryValidator>
  ) {
    this.execute = createCleanExecute({
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      executeCore: this.executeCore.bind(this)
    });
  }

  /**
   * Executes the clean command.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command result.
   */
  private executeCore(
    directory: string,
    options: Readonly<ICleanCommandOptions>,
    context?: Readonly<IAutoConfigContext<ICleanCommandOptions>>
  ): Promise<ICommandResult> {
    const commandContext = this.createCommandContext(directory, options, context);
    const result = this.cleaner.clean(commandContext.targetDir, commandContext.cleanOptions);
    this.logSummary(result, commandContext.logger);
    return Promise.resolve(this.buildResult(result));
  }

  /**
   * Creates execution context for the clean command.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command context.
   */
  private createCommandContext(
    directory: string,
    options: Readonly<ICleanCommandOptions>,
    context?: Readonly<IAutoConfigContext<ICleanCommandOptions>>
  ): Readonly<{ cleanOptions: Readonly<ICleanCommandOptions>; logger: Logger; targetDir: string }> {
    const { config, configOptions, logger, targetDir } = createMappedCommandContextBase({
      directory,
      options,
      context,
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      toConfigOverrides: this.toConfigOverrides.bind(this)
    });
    return {
      cleanOptions: this.toCleanerOptions(configOptions, {
        dryRun: config.dryRun,
        includeHidden: config.includeHidden
      }),
      logger,
      targetDir
    };
  }

  /**
   * Builds config override input from clean options.
   * @param options - Clean command options.
   * @returns Config override object.
   */
  private toConfigOverrides(
    options: Readonly<ICleanCommandOptions>
  ): Readonly<{ config?: string; dryRun?: boolean; logLevel?: string }> {
    return {
      config: options.config,
      dryRun: options.dryRun,
      logLevel: options.logLevel
    };
  }

  /**
   * Builds cleaner options with config-based fallbacks.
   * @param options - Parsed clean command options.
   * @param defaults - Config defaults for dry-run and include-hidden.
   * @returns Cleaner options.
   */
  private toCleanerOptions(
    options: Readonly<ICleanCommandOptions>,
    defaults: Readonly<{ dryRun: boolean; includeHidden: boolean }>
  ): Readonly<ICleanCommandOptions> {
    return {
      dryRun: options.dryRun ?? defaults.dryRun,
      includeHidden: options.includeHidden ?? defaults.includeHidden,
      removeOrderlyDir: options.removeOrderlyDir ?? false
    };
  }

  /**
   * Logs clean summary and errors.
   * @param result - Cleaner result.
   * @param logger - Logger instance.
   */
  private logSummary(
    result: Readonly<{
      errors: readonly Readonly<{ error: string; path: string }>[];
      removedDirectories: number;
      scannedDirectories: number;
      skippedDirectories: number;
    }>,
    logger: Readonly<Logger>
  ): void {
    logger.info(this.createSummaryMessage(result));
    for (const cleanError of result.errors) {
      logger.error(`${cleanError.path}: ${cleanError.error}`);
    }
  }

  /**
   * Creates the clean summary string.
   * @param result - Cleaner result.
   * @returns Summary message.
   */
  private createSummaryMessage(
    result: Readonly<{
      removedDirectories: number;
      scannedDirectories: number;
      skippedDirectories: number;
    }>
  ): string {
    return COMMAND_MESSAGES.CLEAN_SUCCESS.replace('{0}', String(result.scannedDirectories))
      .replace('{1}', String(result.removedDirectories))
      .replace('{2}', String(result.skippedDirectories));
  }

  /**
   * Builds the final command result.
   * @param result - Cleaner result.
   * @returns CLI command result.
   */
  private buildResult(
    result: Readonly<{
      errors: readonly unknown[];
      removedDirectories: number;
      scannedDirectories: number;
      skippedDirectories: number;
    }>
  ): ICommandResult {
    const success = result.errors.length === 0;
    return {
      success,
      exitCode: success ? ExitCode.SUCCESS : ExitCode.ERROR,
      message: this.createSummaryMessage(result)
    };
  }
}

/**
 * Creates normalized clean boolean options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized boolean options.
 */
function createCleanBooleanOptions(value: object): Readonly<ICleanCommandOptions> {
  const autoConfig = getOptionalBooleanOption(value, CleanOptionKey.AUTO_CONFIG);
  const dryRun = getOptionalBooleanOption(value, CleanOptionKey.DRY_RUN);
  const includeHidden = getOptionalBooleanOption(value, CleanOptionKey.INCLUDE_HIDDEN);
  const removeOrderlyDir = getOptionalBooleanOption(value, CleanOptionKey.REMOVE_ORDERLY_DIR);
  return {
    ...(autoConfig === undefined ? {} : { autoConfig }),
    ...(dryRun === undefined ? {} : { dryRun }),
    ...(includeHidden === undefined ? {} : { includeHidden }),
    ...(removeOrderlyDir === undefined ? {} : { removeOrderlyDir })
  };
}

/**
 * Creates the wrapped execute function for the clean handler.
 * @param handler - Clean handler dependencies.
 * @returns Wrapped execute function.
 */
function createCleanExecute(
  handler: Readonly<ICleanExecuteDependencies>
): (
  directory: string,
  options: Readonly<ICleanCommandOptions>,
  context?: Readonly<IAutoConfigContext<ICleanCommandOptions>>
) => Promise<ICommandResult> {
  return createWrappedAutoConfigCommand<ICleanCommandOptions>({
    commandName: 'clean',
    errorPrefix: COMMAND_MESSAGES.CLEAN_FAILED,
    executeCore: handler.executeCore.bind(handler),
    normalizeDirectory: normalizeCleanDirectory,
    normalizeOptions: normalizeCleanOptions,
    service: handler
  });
}

/**
 * Creates normalized clean string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createCleanStringOptions(value: object): Readonly<ICleanCommandOptions> {
  const config = getOptionalStringOption(value, CleanOptionKey.CONFIG);
  const logLevel = getOptionalStringOption(value, CleanOptionKey.LOG_LEVEL);
  return {
    ...(config ? { config } : {}),
    ...(logLevel ? { logLevel } : {})
  };
}

/**
 * Normalizes an unknown directory argument to a clean directory string.
 * @param value - Candidate directory value.
 * @returns Directory string.
 */
function normalizeCleanDirectory(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Normalizes an unknown value to clean command options.
 * @param value - Candidate options value.
 * @returns Clean command options.
 */
function normalizeCleanOptions(value: unknown): Readonly<ICleanCommandOptions> {
  return normalizeObjectOptions<ICleanCommandOptions>(
    value,
    createCleanBooleanOptions,
    createCleanStringOptions
  );
}
