import * as path from 'node:path';

import { DedupeAction, DedupeMode, type IDedupeConfig, type IDedupeResult } from '../../dedupe';
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

const DEFAULT_REPORT_DIRECTORY = '.orderly';
const DEFAULT_REPORT_JSON_FILENAME = 'dedupe-report.json';
const DEFAULT_REPORT_MARKDOWN_FILENAME = 'dedupe-report.md';

/**
 * Converts a scanned file into its original file path.
 * @param file - Scanned file.
 * @returns Original file path.
 */
function toOriginalPath(file: Readonly<{ originalPath: string }>): string {
  return file.originalPath;
}

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
  ): Readonly<{
    dedupeConfig: Readonly<IDedupeConfig>;
    options: Readonly<IDedupeCommandOptions>;
    scanner: FileScanner;
    targetDir: string;
  }> {
    const commandOptions = context?.configOptions ?? { ...options };
    const targetDir = context?.targetDir ?? this.directoryValidator.validate(directory);
    const config = this.configService.loadWithOverrides(this.toConfigOverrides(commandOptions));
    const logger = new Logger(config.logLevel);
    this.logAutoDiscoveredConfig(logger, context?.autoDiscoveredConfig);
    return {
      dedupeConfig: this.resolveDedupeConfig(config.dedupe, commandOptions.action),
      options: commandOptions,
      scanner: new FileScanner(config, logger),
      targetDir
    };
  }

  /**
   * Builds config override input from dedupe options.
   * @param options - Dedupe command options.
   * @returns Config override object.
   */
  private toConfigOverrides(options: Readonly<IDedupeCommandOptions>): Readonly<{
    config?: string;
    dedupe?: boolean;
    dedupeAction?: string;
    dryRun?: boolean;
    logLevel?: string;
  }> {
    return {
      config: options.config,
      dedupe: true,
      dedupeAction: options.action,
      dryRun: options.dryRun,
      logLevel: options.logLevel
    };
  }

  /**
   * Resolves the active dedupe config for the standalone command.
   * @param dedupeConfig - Config-sourced dedupe configuration.
   * @param action - Optional CLI action override.
   * @returns Active dedupe config.
   */
  private resolveDedupeConfig(
    dedupeConfig: Readonly<IDedupeConfig> | undefined,
    action?: string
  ): Readonly<IDedupeConfig> {
    const resolvedAction =
      this.resolveAction(action) ?? dedupeConfig?.action ?? DedupeAction.REPORT;
    return {
      enabled: true,
      recursive: dedupeConfig?.recursive ?? false,
      strategy: dedupeConfig?.strategy ?? { mode: DedupeMode.ANY },
      action: resolvedAction
    };
  }

  /**
   * Resolves a CLI action string to an enum member.
   * @param action - CLI action string.
   * @returns Supported dedupe action when valid.
   */
  private resolveAction(action?: string): DedupeAction | undefined {
    switch (action) {
      case DedupeAction.SKIP:
        return DedupeAction.SKIP;
      case DedupeAction.REPORT:
        return DedupeAction.REPORT;
      case DedupeAction.REPLACE:
        return DedupeAction.REPLACE;
      default:
        return undefined;
    }
  }

  /**
   * Logs any auto-discovered config path.
   * @param logger - Logger instance.
   * @param autoDiscoveredConfig - Auto-discovered config path.
   */
  private logAutoDiscoveredConfig(logger: Readonly<Logger>, autoDiscoveredConfig?: string): void {
    if (autoDiscoveredConfig) {
      logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
    }
  }

  /**
   * Applies file replacement for REPLACE action when not in dry-run mode.
   * @param commandContext - Dedupe command context.
   * @param result - Dedupe result.
   * @returns Deletion error messages.
   */
  private async applyReplaceActionIfNeeded(
    commandContext: Readonly<{
      dedupeConfig: Readonly<IDedupeConfig>;
      options: Readonly<IDedupeCommandOptions>;
    }>,
    result: Readonly<IDedupeResult>
  ): Promise<readonly string[]> {
    if (!this.shouldDeleteDuplicates(commandContext.dedupeConfig.action, commandContext.options)) {
      return [];
    }

    const outcome = await DedupeStrategyFactory.createDedupeService(
      commandContext.dedupeConfig
    ).applyAction(result, DedupeAction.REPLACE);
    return this.deleteDuplicateFiles(outcome.replaced.map(toOriginalPath));
  }

  /**
   * Returns whether duplicate source files should be deleted.
   * @param action - Active dedupe action.
   * @param options - Parsed command options.
   * @returns True when replacement deletions should run.
   */
  private shouldDeleteDuplicates(
    action: Readonly<DedupeAction>,
    options: Readonly<IDedupeCommandOptions>
  ): boolean {
    return action === DedupeAction.REPLACE && !options.dryRun;
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
        errors = [...errors, this.toDeleteError(filePath, error)];
      }
    }

    return errors;
  }

  /**
   * Builds a delete error string.
   * @param filePath - File path that failed.
   * @param error - Thrown error.
   * @returns Error message.
   */
  private toDeleteError(filePath: string, error: unknown): string {
    return `${filePath}: ${error instanceof Error ? error.message : String(error)}`;
  }

  /**
   * Writes report files when requested or when report action is active.
   * @param commandContext - Dedupe command context.
   * @param result - Dedupe result.
   * @returns Promise resolving after report generation.
   */
  private async writeReportsIfRequested(
    commandContext: Readonly<{
      dedupeConfig: Readonly<IDedupeConfig>;
      options: Readonly<IDedupeCommandOptions>;
      targetDir: string;
    }>,
    result: Readonly<IDedupeResult>
  ): Promise<void> {
    const reportPaths = this.resolveReportPaths(commandContext);
    if (!reportPaths.jsonPath && !reportPaths.markdownPath) {
      return;
    }

    await Promise.all(this.createReportWrites(reportPaths, result));
  }

  /**
   * Resolves report output paths.
   * @param commandContext - Dedupe command context.
   * @returns Resolved report paths.
   */
  private resolveReportPaths(
    commandContext: Readonly<{
      dedupeConfig: Readonly<IDedupeConfig>;
      options: Readonly<IDedupeCommandOptions>;
      targetDir: string;
    }>
  ): Readonly<{ jsonPath?: string; markdownPath?: string }> {
    const reportDirectory = path.join(commandContext.targetDir, DEFAULT_REPORT_DIRECTORY);
    const jsonPath =
      commandContext.options.reportJson ??
      this.getDefaultReportPath(
        commandContext.dedupeConfig.action,
        reportDirectory,
        DEFAULT_REPORT_JSON_FILENAME
      );
    const markdownPath =
      commandContext.options.reportMarkdown ??
      this.getDefaultReportPath(
        commandContext.dedupeConfig.action,
        reportDirectory,
        DEFAULT_REPORT_MARKDOWN_FILENAME
      );

    return { jsonPath, markdownPath };
  }

  /**
   * Returns the default report path when the action is REPORT.
   * @param action - Active dedupe action.
   * @param reportDirectory - Report directory.
   * @param filename - Report filename.
   * @returns Default report path or undefined.
   */
  private getDefaultReportPath(
    action: Readonly<DedupeAction>,
    reportDirectory: string,
    filename: string
  ): string | undefined {
    return action === DedupeAction.REPORT ? path.join(reportDirectory, filename) : undefined;
  }

  /**
   * Creates report-write promises for configured output paths.
   * @param reportPaths - Resolved report paths.
   * @param result - Dedupe result.
   * @returns Report write promises.
   */
  private createReportWrites(
    reportPaths: Readonly<{ jsonPath?: string; markdownPath?: string }>,
    result: Readonly<IDedupeResult>
  ): readonly Promise<void>[] {
    let writes: readonly Promise<void>[] = [];

    if (reportPaths.jsonPath) {
      writes = [...writes, this.reportWriter.write(result, reportPaths.jsonPath)];
    }

    if (reportPaths.markdownPath) {
      writes = [...writes, this.reportWriter.writeMarkdown(result, reportPaths.markdownPath)];
    }

    return writes;
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
