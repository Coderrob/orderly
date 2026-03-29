import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system-utils';
import { isArray, isObject, isString } from '../../utils/guards';
import { COMMAND_MESSAGES, ExitCode } from '../constants';
import type { ICommandResult, IRevertCommandOptions, IRevertHandler } from '../interfaces';

import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';
import {
  createSingleOptionsCommandExecutionRef,
  createWrappedSingleOptionsCommand
} from './command-wrapper.helpers';

const SUCCESS_STATUS = 'success';

interface IManifestEntryLike {
  readonly operation: Readonly<{ newPath: string; originalPath: string }>;
  readonly status: string;
}

interface IManifestLike {
  readonly entries: readonly IManifestEntryLike[];
}

interface IRevertMode {
  readonly dryRun: boolean;
}

/**
 * Handler for manifest-based revert operations.
 */
export class RevertHandler implements IRevertHandler {
  public readonly execute: (options: Readonly<IRevertCommandOptions>) => Promise<ICommandResult>;

  /**
   * Creates a new revert command handler.
   */
  constructor() {
    this.execute = createWrappedSingleOptionsCommand({
      commandName: 'revert',
      errorPrefix: COMMAND_MESSAGES.REVERT_FAILED,
      executeCoreRef: createSingleOptionsCommandExecutionRef({
        executeCore: this.executeCore.bind(this),
        normalizeOptions: normalizeRevertOptions
      })
    });
  }

  /**
   * Executes the revert command.
   * @param options - Revert options.
   * @returns Command result.
   */
  private executeCore(options: Readonly<IRevertCommandOptions>): Promise<ICommandResult> {
    const manifest = this.readManifest(options.manifest);
    const successfulEntries = this.getSuccessfulEntries(manifest.entries);
    const revertResult = this.revertEntries(reverseEntries(successfulEntries), {
      dryRun: Boolean(options.dryRun)
    });
    return Promise.resolve({
      success: revertResult.failed === 0,
      exitCode: revertResult.failed === 0 ? ExitCode.SUCCESS : ExitCode.ERROR,
      message: COMMAND_MESSAGES.REVERT_SUCCESS.replace('{0}', String(revertResult.reverted))
        .replace('{1}', String(revertResult.skipped))
        .replace('{2}', String(revertResult.failed))
    });
  }

  /**
   * Reads and parses a manifest file.
   * @param manifestPath - Manifest file path.
   * @returns Parsed manifest.
   */
  private readManifest(manifestPath: string): IManifestLike {
    const parsed = parseManifestJson(FileSystemUtils.readFileSync(path.resolve(manifestPath)));
    return isManifestLike(parsed) ? parsed : { entries: [] };
  }

  /**
   * Returns entries that completed successfully and are safe to reverse.
   * @param entries - Manifest entries.
   * @returns Successful entries.
   */
  private getSuccessfulEntries(
    entries: readonly IManifestEntryLike[]
  ): readonly IManifestEntryLike[] {
    return entries.filter(isSuccessfulEntry);
  }

  /**
   * Reverts manifest entries in reverse execution order.
   * @param entries - Entries to revert.
   * @param mode - Revert mode configuration.
   * @returns Revert summary.
   */
  private revertEntries(
    entries: readonly IManifestEntryLike[],
    mode: Readonly<IRevertMode>
  ): Readonly<{ failed: number; reverted: number; skipped: number }> {
    let reverted = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of entries) {
      const outcome = this.revertEntry(entry, mode);
      reverted += outcome.reverted;
      skipped += outcome.skipped;
      failed += outcome.failed;
    }

    return { reverted, skipped, failed };
  }

  /**
   * Reverts a single manifest entry.
   * @param entry - Entry to revert.
   * @param mode - Revert mode configuration.
   * @returns Revert counters.
   */
  private revertEntry(
    entry: Readonly<IManifestEntryLike>,
    mode: Readonly<IRevertMode>
  ): Readonly<{ failed: number; reverted: number; skipped: number }> {
    const sourcePath = entry.operation.newPath;
    const targetPath = entry.operation.originalPath;

    if (!FileSystemUtils.hasPath(sourcePath)) {
      return { reverted: 0, skipped: 1, failed: 0 };
    }

    if (mode.dryRun) {
      return { reverted: 1, skipped: 0, failed: 0 };
    }

    if (FileSystemUtils.hasPath(targetPath)) {
      return { reverted: 0, skipped: 1, failed: 0 };
    }

    try {
      FileSystemUtils.mkdirSync(path.dirname(targetPath));
      FileSystemUtils.renameSync(sourcePath, targetPath);
      return { reverted: 1, skipped: 0, failed: 0 };
    } catch {
      return { reverted: 0, skipped: 0, failed: 1 };
    }
  }
}

enum RevertOptionKey {
  DRY_RUN = 'dryRun',
  MANIFEST = 'manifest'
}

/**
 * Appends one entry while building a reversed manifest-entry list.
 * @param reversedEntries - Entries accumulated so far.
 * @param entry - Next entry from the right-hand traversal.
 * @returns Updated reversed entries.
 */
function appendReversedEntry(
  reversedEntries: readonly IManifestEntryLike[],
  entry: Readonly<IManifestEntryLike>
): readonly IManifestEntryLike[] {
  return [...reversedEntries, entry];
}

/**
 * Creates normalized revert boolean options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized boolean options.
 */
function createRevertBooleanOptions(value: object): Readonly<Partial<IRevertCommandOptions>> {
  const dryRun = getOptionalBooleanOption(value, RevertOptionKey.DRY_RUN);
  return {
    ...(dryRun === undefined ? {} : { dryRun })
  };
}

/**
 * Creates normalized revert string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createRevertStringOptions(value: object): Readonly<Partial<IRevertCommandOptions>> {
  const manifest = getOptionalStringOption(value, RevertOptionKey.MANIFEST);
  return {
    ...(manifest ? { manifest } : {})
  };
}

/**
 * Returns whether an object record exposes an entries array.
 * @param value - Record under inspection.
 * @returns True when the entries property is an array.
 */
function hasEntriesArray(
  value: Readonly<Record<string, unknown>>
): value is Readonly<{ entries: unknown[] }> & Readonly<Record<string, unknown>> {
  return isArray(value.entries);
}

/**
 * Returns whether an unknown value exposes manifest operation paths.
 * @param value - Entry candidate.
 * @returns True when the value has string original/new paths.
 */
function hasManifestOperation(
  value: unknown
): value is Readonly<{ operation: Readonly<{ newPath: string; originalPath: string }> }> {
  if (!isObject(value) || !hasOperationRecord(value)) {
    return false;
  }

  const operation = value.operation;
  return isObject(operation) && hasNewPathString(operation) && hasOriginalPathString(operation);
}

/**
 * Returns whether an operation record exposes a string `newPath` value.
 * @param value - Operation record under inspection.
 * @returns True when the newPath property is a string.
 */
function hasNewPathString(
  value: Readonly<Record<string, unknown>>
): value is Readonly<{ newPath: string }> & Readonly<Record<string, unknown>> {
  return isString(value.newPath);
}

/**
 * Returns whether an object record exposes an operation object.
 * @param value - Record under inspection.
 * @returns True when the operation property is an object record.
 */
function hasOperationRecord(
  value: Readonly<Record<string, unknown>>
): value is Readonly<{ operation: Record<string, unknown> }> & Readonly<Record<string, unknown>> {
  return isObject(value.operation);
}

/**
 * Returns whether an operation record exposes a string `originalPath` value.
 * @param value - Operation record under inspection.
 * @returns True when the originalPath property is a string.
 */
function hasOriginalPathString(
  value: Readonly<Record<string, unknown>>
): value is Readonly<{ originalPath: string }> & Readonly<Record<string, unknown>> {
  return isString(value.originalPath);
}

/**
 * Returns whether an object record exposes a string `status` value.
 * @param value - Record under inspection.
 * @returns True when the status property is a string.
 */
function hasStatusString(
  value: Readonly<Record<string, unknown>>
): value is Readonly<{ status: string }> & Readonly<Record<string, unknown>> {
  return isString(value.status);
}

/**
 * Returns whether an unknown value matches the minimal manifest-entry shape.
 * @param value - Entry candidate.
 * @returns True when the entry exposes status and operation paths.
 */
function isManifestEntryLike(value: unknown): value is IManifestEntryLike {
  return isObject(value) && hasStatusString(value) && hasManifestOperation(value);
}

/**
 * Returns whether a parsed value looks like a manifest payload.
 * @param value - Parsed JSON value.
 * @returns True when the value exposes manifest entries.
 */
function isManifestLike(value: unknown): value is IManifestLike {
  return isObject(value) && hasEntriesArray(value) && value.entries.every(isManifestEntryLike);
}

/**
 * Returns whether a manifest entry completed successfully.
 * @param entry - Manifest entry under inspection.
 * @returns True when the entry status is success.
 */
function isSuccessfulEntry(entry: Readonly<IManifestEntryLike>): boolean {
  return entry.status === SUCCESS_STATUS;
}

/**
 * Normalizes an unknown command argument to revert options.
 * @param value - Candidate options value.
 * @returns Normalized revert options.
 */
function normalizeRevertOptions(value: unknown): Readonly<IRevertCommandOptions> {
  return {
    manifest: '',
    ...normalizeObjectOptions<IRevertCommandOptions>(
      value,
      createRevertBooleanOptions,
      createRevertStringOptions
    )
  };
}

/**
 * Parses manifest JSON content.
 * @param manifestContent - Raw manifest JSON content.
 * @returns Parsed manifest payload.
 */
function parseManifestJson(manifestContent: string): unknown {
  return JSON.parse(manifestContent);
}

/**
 * Returns entries in reverse order without mutating the source.
 * @param entries - Manifest entries.
 * @returns Reversed entries.
 */
function reverseEntries(entries: readonly IManifestEntryLike[]): readonly IManifestEntryLike[] {
  return entries.reduceRight<readonly IManifestEntryLike[]>(appendReversedEntry, []);
}
