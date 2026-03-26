import { Logger } from '../../logger/logger';
import { COMMAND_MESSAGES, ExitCode } from '../constants';
import {
  IAutoConfigContext,
  WithAutoConfigDiscovery
} from '../decorators/auto-config-discovery.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type {
  ICleanCommandOptions,
  ICleanHandler,
  ICleanerService,
  IConfigService,
  ICommandResult,
  IDirectoryValidator
} from '../interfaces';

import { createMappedCommandContextBase, logAutoDiscoveredConfig } from './command-context.helpers';

/**
 * Handler for the clean command.
 */
export class CleanHandler implements ICleanHandler {
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
  ) {}

  /**
   * Executes the clean command.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command result.
   */
  @WithCommandTelemetry('clean')
  @HandleCommandErrors(COMMAND_MESSAGES.CLEAN_FAILED)
  @WithAutoConfigDiscovery<ICleanCommandOptions>()
  execute(
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
   * Logs any auto-discovered config path.
   * @param logger - Logger instance.
   * @param autoDiscoveredConfig - Auto-discovered config path.
   */
  private logAutoDiscoveredConfig(logger: Readonly<Logger>, autoDiscoveredConfig?: string): void {
    logAutoDiscoveredConfig(logger, autoDiscoveredConfig);
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
