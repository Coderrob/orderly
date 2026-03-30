import * as path from 'node:path';

import {
  DedupeAction,
  DedupeMode,
  type IDedupeConfig,
  type IDedupeResult,
  type IDedupeStrategyConfig
} from '../../dedupe';
import { Clock } from '../../utils/clock';
import { FileSystemUtils } from '../../utils/file-system-utils';
import { ExitCode } from '../constants';
import type { IDedupeCommandOptions, IDedupeReportService, ICommandResult } from '../interfaces';

const DEFAULT_REPORT_DIRECTORY = '.orderly';
const DEFAULT_REPORT_JSON_FILENAME = 'dedupe-report.json';
const DEFAULT_REPORT_MARKDOWN_FILENAME = 'dedupe-report.md';
const DEFAULT_QUARANTINE_DIRECTORY = '.orderly/quarantine';
const PRESET_EXACT_CONFIG: IDedupeStrategyConfig = {
  mode: DedupeMode.ALL,
  size: true,
  sha256: true
};
const PRESET_FAST_CONFIG: IDedupeStrategyConfig = {
  mode: DedupeMode.ANY,
  size: true,
  name: { caseSensitive: false, ignoreExtension: false }
};
const PRESET_MEDIA_CONFIG: IDedupeStrategyConfig = {
  mode: DedupeMode.ALL,
  size: true,
  sha256: true,
  imageDimensions: true,
  exif: true
};
const REPLACE_SAFETY_MESSAGE =
  'Dedupe replace requires --confirm-replace or --quarantine-dir when not running in dry-run mode';

export enum DedupePreset {
  EXACT = 'exact',
  FAST = 'fast',
  MEDIA = 'media',
  SAFE = 'safe'
}

export interface IDedupeCommandInput {
  readonly action?: Readonly<DedupeAction>;
  readonly config?: string;
  readonly confirmReplace: boolean;
  readonly dryRun?: boolean;
  readonly logLevel?: string;
  readonly preset?: Readonly<DedupePreset>;
  readonly quarantineDir?: string;
  readonly reportJson?: string;
  readonly reportMarkdown?: string;
}

export interface IDedupeCommandContext {
  readonly dedupeConfig: Readonly<IDedupeConfig>;
  readonly options: Readonly<IDedupeCommandInput>;
  readonly targetDir: string;
}

export interface IReportPaths {
  readonly jsonPath?: string;
  readonly markdownPath?: string;
}

export interface IDeleteSafetyContext {
  readonly dedupeConfig: Readonly<IDedupeConfig>;
  readonly options: Readonly<IDedupeCommandInput>;
}

export interface IFilePathSource {
  readonly originalPath: string;
}

/**
 * Builds config override input from dedupe options.
 * @param options - Dedupe command options.
 * @returns Config override object.
 */
export function createDedupeConfigOverrides(options: Readonly<IDedupeCommandInput>): Readonly<{
  config?: string;
  dedupe?: boolean;
  dedupeAction?: DedupeAction;
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
 * Creates report-write promises for configured output paths.
 * @param reportWriter - Report writer dependency.
 * @param reportPaths - Resolved report paths.
 * @param result - Dedupe result.
 * @returns Report write promises.
 */
export function createReportWrites(
  reportWriter: Readonly<IDedupeReportService>,
  reportPaths: Readonly<IReportPaths>,
  result: Readonly<IDedupeResult>
): readonly Promise<void>[] {
  let writes: readonly Promise<void>[] = [];

  if (reportPaths.jsonPath) {
    writes = [...writes, reportWriter.write(result, reportPaths.jsonPath)];
  }

  if (reportPaths.markdownPath) {
    writes = [...writes, reportWriter.writeMarkdown(result, reportPaths.markdownPath)];
  }

  return writes;
}

/**
 * Returns the default report path when the action is REPORT.
 * @param action - Active dedupe action.
 * @param reportDirectory - Report directory.
 * @param filename - Report filename.
 * @returns Default report path or undefined.
 */
export function getDefaultReportPath(
  action: Readonly<DedupeAction>,
  reportDirectory: string,
  filename: string
): string | undefined {
  return action === DedupeAction.REPORT ? path.join(reportDirectory, filename) : undefined;
}

/**
 * Converts a scanned file into its original file path.
 * @param file - Scanned file.
 * @returns Original file path.
 */
export function getOriginalPath(file: Readonly<IFilePathSource>): string {
  return file.originalPath;
}

/**
 * Normalizes parsed dedupe command options into typed command input.
 * @param options - Parsed dedupe command options.
 * @returns Typed command input.
 */
export function normalizeDedupeCommandOptions(
  options: Readonly<IDedupeCommandOptions>
): Readonly<IDedupeCommandInput> {
  return {
    action: resolveAction(options.action),
    config: options.config,
    confirmReplace: options.confirmReplace ?? false,
    dryRun: options.dryRun,
    logLevel: options.logLevel,
    preset: resolvePreset(options.preset),
    quarantineDir: options.quarantineDir,
    reportJson: options.reportJson,
    reportMarkdown: options.reportMarkdown
  };
}

/**
 * Resolves a CLI action string to an enum member.
 * @param action - CLI action string.
 * @returns Supported dedupe action when valid.
 */
export function resolveAction(action?: string): DedupeAction | undefined {
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
 * Resolves the active dedupe config for the standalone command.
 * @param dedupeConfig - Config-sourced dedupe configuration.
 * @param action - Optional CLI action override.
 * @param preset - Optional dedupe preset override.
 * @returns Active dedupe config.
 */
export function resolveDedupeConfig(
  dedupeConfig: Readonly<IDedupeConfig> | undefined,
  action?: Readonly<DedupeAction>,
  preset?: Readonly<DedupePreset>
): Readonly<IDedupeConfig> {
  const resolvedAction = action ?? dedupeConfig?.action ?? DedupeAction.REPORT;
  const strategy = resolveStrategyPreset(preset) ??
    dedupeConfig?.strategy ?? { mode: DedupeMode.ANY };

  return {
    enabled: true,
    recursive: dedupeConfig?.recursive ?? false,
    strategy,
    action: resolvedAction
  };
}

/**
 * Resolves a CLI preset string to an enum member.
 * @param preset - CLI preset string.
 * @returns Supported dedupe preset when valid.
 */
export function resolvePreset(preset?: string): DedupePreset | undefined {
  switch (preset) {
    case DedupePreset.EXACT:
      return DedupePreset.EXACT;
    case DedupePreset.FAST:
      return DedupePreset.FAST;
    case DedupePreset.MEDIA:
      return DedupePreset.MEDIA;
    case DedupePreset.SAFE:
      return DedupePreset.SAFE;
    default:
      return undefined;
  }
}

/**
 * Resolves a unique quarantine destination path.
 * @param filePath - Original file path.
 * @param quarantineDir - Quarantine directory.
 * @returns Destination path.
 */
export function resolveQuarantinePath(filePath: string, quarantineDir: string): string {
  const baseDirectory = path.resolve(quarantineDir || DEFAULT_QUARANTINE_DIRECTORY);
  const filename = path.basename(filePath);
  const destinationPath = path.join(baseDirectory, filename);
  return FileSystemUtils.hasPath(destinationPath)
    ? path.join(baseDirectory, `${Clock.nowMonotonicToken()}-${filename}`)
    : destinationPath;
}

/**
 * Resolves report output paths.
 * @param commandContext - Dedupe command context.
 * @returns Resolved report paths.
 */
export function resolveReportPaths(
  commandContext: Readonly<IDedupeCommandContext>
): Readonly<IReportPaths> {
  const reportDirectory = path.join(commandContext.targetDir, DEFAULT_REPORT_DIRECTORY);
  const jsonPath =
    commandContext.options.reportJson ??
    getDefaultReportPath(
      commandContext.dedupeConfig.action,
      reportDirectory,
      DEFAULT_REPORT_JSON_FILENAME
    );
  const markdownPath =
    commandContext.options.reportMarkdown ??
    getDefaultReportPath(
      commandContext.dedupeConfig.action,
      reportDirectory,
      DEFAULT_REPORT_MARKDOWN_FILENAME
    );

  return { jsonPath, markdownPath };
}

/**
 * Resolves a named strategy preset.
 * @param preset - Preset name.
 * @returns Strategy preset or undefined.
 */
export function resolveStrategyPreset(
  preset?: Readonly<DedupePreset>
): IDedupeStrategyConfig | undefined {
  switch (preset) {
    case DedupePreset.EXACT:
      return PRESET_EXACT_CONFIG;
    case DedupePreset.FAST:
      return PRESET_FAST_CONFIG;
    case DedupePreset.MEDIA:
      return PRESET_MEDIA_CONFIG;
    case DedupePreset.SAFE:
      return PRESET_EXACT_CONFIG;
    default:
      return undefined;
  }
}

/**
 * Returns whether duplicate source files should be deleted.
 * @param action - Active dedupe action.
 * @param options - Parsed command options.
 * @returns True when replacement deletions should run.
 */
export function shouldDeleteDuplicates(
  action: Readonly<DedupeAction>,
  options: Readonly<{ dryRun?: boolean }>
): boolean {
  return action === DedupeAction.REPLACE && !options.dryRun;
}

/**
 * Builds a delete error string.
 * @param filePath - File path that failed.
 * @param error - Thrown error.
 * @returns Error message.
 */
export function toDeleteError(filePath: string, error: unknown): string {
  return `${filePath}: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Validates destructive replace safety requirements.
 * @param commandContext - Dedupe command context.
 * @returns Failure result when the action is unsafe; otherwise undefined.
 */
export function validateReplaceSafety(
  commandContext: Readonly<IDeleteSafetyContext>
): ICommandResult | undefined {
  const requiresConfirmation =
    commandContext.dedupeConfig.action === DedupeAction.REPLACE &&
    !commandContext.options.dryRun &&
    !commandContext.options.confirmReplace &&
    !commandContext.options.quarantineDir;

  return requiresConfirmation
    ? {
        success: false,
        exitCode: ExitCode.ERROR,
        message: REPLACE_SAFETY_MESSAGE
      }
    : undefined;
}
