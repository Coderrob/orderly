import * as path from 'node:path';

import { type OrderlyConfig } from '../../config/types';
import { DedupeAction, type IDedupeResult } from '../../dedupe';
import { DedupeStrategyFactory } from '../../dedupe/dedupe-factory';
import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
import { FileSystemUtils } from '../../utils/file-system-utils';
import { COMMAND_MESSAGES, ExitCode } from '../constants';
import {
  IAutoConfigContext,
  WithAutoConfigDiscovery
} from '../decorators/auto-config-discovery.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type {
  IConfigService,
  IDedupeCommandOptions,
  IDedupeHandler,
  IDedupeReportService,
  IDirectoryValidator,
  ICommandResult
} from '../interfaces';

import { createMappedCommandContextBase, logAutoDiscoveredConfig } from './command-context.helpers';
import {
  createDedupeConfigOverrides,
  createReportWrites,
  normalizeDedupeCommandOptions,
  getOriginalPath,
  resolveDedupeConfig,
  resolveQuarantinePath,
  resolveReportPaths,
  shouldDeleteDuplicates,
  toDeleteError,
  validateReplaceSafety,
  type IDedupeCommandContext,
  type IDedupeCommandInput,
  type IDeleteSafetyContext
} from './dedupe.command.helpers';

/**
 * Handler for the standalone dedupe command.
 */
export class DedupeHandler implements IDedupeHandler {
  /**
   * Creates a new dedupe command handler.
   * @param configService - Config loading service.
   * @param directoryValidator - Directory validation service.
   * @param reportWriter - Dedupe report writer.
   */
  constructor(
    readonly configService: Readonly<IConfigService>,
    readonly directoryValidator: Readonly<IDirectoryValidator>,
    private readonly reportWriter: Readonly<IDedupeReportService>
  ) {}

  /**
   * Executes the dedupe command.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command result.
   */
  @WithCommandTelemetry('dedupe')
  @HandleCommandErrors(COMMAND_MESSAGES.DEDUPE_FAILED)
  @WithAutoConfigDiscovery<IDedupeCommandOptions>()
  async execute(
    directory: string,
    options: Readonly<IDedupeCommandOptions>,
    context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
  ): Promise<ICommandResult> {
    const commandContext = this.createCommandContext(directory, options, context);
    const replacementGuardResult = this.validateReplaceSafety(commandContext);
    if (replacementGuardResult) {
      return replacementGuardResult;
    }
    const files = await commandContext.scanner.scan(commandContext.targetDir);
    const result = await DedupeStrategyFactory.createDedupeService(
      commandContext.dedupeConfig
    ).findDuplicates(files);
    const deleteErrors = await this.applyReplaceActionIfNeeded(commandContext, result);
    await this.writeReportsIfRequested(commandContext, result);
    return this.buildResult(result, deleteErrors.length);
  }

  /**
   * Creates dedupe execution context.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command context.
   */
  private createCommandContext(
    directory: string,
    options: Readonly<IDedupeCommandOptions>,
    context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
  ): Readonly<IDedupeCommandContext & { readonly scanner: FileScanner }> {
    const commandOptions = normalizeDedupeCommandOptions(context?.configOptions ?? { ...options });
    const { config, configOptions, logger, targetDir } = createMappedCommandContextBase({
      directory,
      options: commandOptions,
      context: this.normalizeContext(context),
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      toConfigOverrides: createDedupeConfigOverrides
    });
    return this.buildCommandContext(config, configOptions, logger, targetDir);
  }

  /**
   * Builds the final command context object.
   * @param config - Loaded config.
   * @param options - Effective command options.
   * @param logger - Logger instance.
   * @param targetDir - Validated target directory.
   * @returns Command context.
   */
  private buildCommandContext(
    config: Readonly<OrderlyConfig>,
    options: Readonly<IDedupeCommandInput>,
    logger: Readonly<Logger>,
    targetDir: string
  ): Readonly<IDedupeCommandContext & { readonly scanner: FileScanner }> {
    return {
      dedupeConfig: resolveDedupeConfig(config.dedupe, options.action, options.preset),
      options,
      scanner: new FileScanner(config, logger),
      targetDir
    };
  }

  /**
   * Normalizes auto-config context into typed dedupe command input.
   * @param context - Optional auto-config context.
   * @returns Context with normalized command input.
   */
  private normalizeContext(context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>):
    | Readonly<{
        readonly autoDiscoveredConfig?: string;
        readonly configOptions: Readonly<IDedupeCommandInput>;
        readonly targetDir: string;
      }>
    | undefined {
    if (!context) {
      return undefined;
    }

    return {
      ...context,
      configOptions: normalizeDedupeCommandOptions(context.configOptions)
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
   * Applies file replacement for REPLACE action when not in dry-run mode.
   * @param commandContext - Dedupe command context.
   * @param result - Dedupe result.
   * @returns Deletion error messages.
   */
  private async applyReplaceActionIfNeeded(
    commandContext: Readonly<IDeleteSafetyContext>,
    result: Readonly<IDedupeResult>
  ): Promise<readonly string[]> {
    if (!shouldDeleteDuplicates(commandContext.dedupeConfig.action, commandContext.options)) {
      return [];
    }

    const outcome = await DedupeStrategyFactory.createDedupeService(
      commandContext.dedupeConfig
    ).applyAction(result, DedupeAction.REPLACE);
    return commandContext.options.quarantineDir
      ? this.quarantineDuplicateFiles(
          outcome.replaced.map(getOriginalPath),
          commandContext.options.quarantineDir
        )
      : this.deleteDuplicateFiles(outcome.replaced.map(getOriginalPath));
  }

  /**
   * Validates destructive replace safety requirements.
   * @param commandContext - Dedupe command context.
   * @returns Failure result when the action is unsafe; otherwise undefined.
   */
  private validateReplaceSafety(
    commandContext: Readonly<IDeleteSafetyContext>
  ): ICommandResult | undefined {
    return validateReplaceSafety(commandContext);
  }

  /**
   * Deletes duplicate files and captures any failures.
   * @param filePaths - File paths to delete.
   * @returns Error messages.
   */
  private deleteDuplicateFiles(filePaths: readonly string[]): readonly string[] {
    let errors: readonly string[] = [];

    for (const filePath of filePaths) {
      try {
        FileSystemUtils.unlinkSync(filePath);
      } catch (error) {
        errors = [...errors, toDeleteError(filePath, error)];
      }
    }

    return errors;
  }

  /**
   * Moves duplicate files into a quarantine directory.
   * @param filePaths - File paths to quarantine.
   * @param quarantineDir - Destination quarantine directory.
   * @returns Error messages.
   */
  private quarantineDuplicateFiles(
    filePaths: readonly string[],
    quarantineDir: string
  ): readonly string[] {
    let errors: readonly string[] = [];

    for (const filePath of filePaths) {
      try {
        const destinationPath = resolveQuarantinePath(filePath, quarantineDir);
        FileSystemUtils.mkdirSync(path.dirname(destinationPath));
        FileSystemUtils.renameSync(filePath, destinationPath);
      } catch (error) {
        errors = [...errors, toDeleteError(filePath, error)];
      }
    }

    return errors;
  }

  /**
   * Writes report files when requested or when report action is active.
   * @param commandContext - Dedupe command context.
   * @param result - Dedupe result.
   * @returns Promise resolving after report generation.
   */
  private async writeReportsIfRequested(
    commandContext: Readonly<IDedupeCommandContext>,
    result: Readonly<IDedupeResult>
  ): Promise<void> {
    const reportPaths = resolveReportPaths(commandContext);
    if (!reportPaths.jsonPath && !reportPaths.markdownPath) {
      return;
    }

    await Promise.all(createReportWrites(this.reportWriter, reportPaths, result));
  }

  /**
   * Builds the final command result.
   * @param result - Dedupe result.
   * @param deleteErrorCount - Duplicate delete error count.
   * @returns CLI command result.
   */
  private buildResult(result: Readonly<IDedupeResult>, deleteErrorCount: number): ICommandResult {
    const success = deleteErrorCount === 0;
    return {
      success,
      exitCode: success ? ExitCode.SUCCESS : ExitCode.ERROR,
      message: COMMAND_MESSAGES.DEDUPE_SUCCESS.replace('{0}', String(result.totalFiles))
        .replace('{1}', String(result.groups.length))
        .replace('{2}', String(result.totalDuplicates))
    };
  }
}
