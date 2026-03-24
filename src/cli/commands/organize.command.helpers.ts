import { DedupeAction } from '../../dedupe';
import type { IDedupeResult } from '../../dedupe/types';
import { Logger } from '../../logger/logger';
import type { IScannedFile } from '../../scanner/interfaces';
import { FileSystemUtils } from '../../utils/file-system-utils';

export interface IDedupeActionContext {
  readonly action: DedupeAction;
  readonly dedupeGroupCount: number;
  readonly dedupeOutcome: Readonly<{
    replaced: readonly IScannedFile[];
    skipped: readonly IScannedFile[];
  }>;
  readonly deleteDuplicates: boolean;
  readonly files: readonly IScannedFile[];
  readonly filteredFiles: readonly IScannedFile[];
  readonly logger: Readonly<Logger>;
}

export interface IDedupeContextBuildParams {
  readonly action: DedupeAction;
  readonly dedupeOutcome: Readonly<{
    replaced: readonly IScannedFile[];
    skipped: readonly IScannedFile[];
  }>;
  readonly dedupeResult: Readonly<IDedupeResult>;
  readonly files: readonly IScannedFile[];
  readonly logger: Readonly<Logger>;
  readonly options: Readonly<{ deleteDuplicates: boolean }>;
}

/**
 * Builds the dedupe action context consumed by the organize command.
 * @param params - Inputs required to assemble dedupe action state.
 * @returns Normalized dedupe action context.
 */
export function buildDedupeActionContext(
  params: Readonly<IDedupeContextBuildParams>
): Readonly<IDedupeActionContext> {
  return {
    action: params.action,
    dedupeGroupCount: params.dedupeResult.groups.length,
    dedupeOutcome: params.dedupeOutcome,
    deleteDuplicates: params.options.deleteDuplicates,
    files: params.files,
    filteredFiles: filterDuplicateFiles(
      params.files,
      params.dedupeOutcome.skipped,
      params.dedupeOutcome.replaced
    ),
    logger: params.logger
  };
}

/**
 * Collects duplicate file paths produced by dedupe actions.
 * @param skipped - Files skipped by dedupe.
 * @param replaced - Files replaced by dedupe.
 * @returns Duplicate file paths.
 */
function collectDuplicatePaths(
  skipped: readonly IScannedFile[],
  replaced: readonly IScannedFile[]
): readonly string[] {
  let paths: readonly string[] = [];

  for (const file of skipped) {
    paths = [...paths, file.originalPath];
  }

  for (const file of replaced) {
    paths = [...paths, file.originalPath];
  }

  return [...paths];
}

/**
 * Removes duplicate files from the organization set.
 * @param files - Files considered for organization.
 * @param skipped - Files skipped by dedupe.
 * @param replaced - Files replaced by dedupe.
 * @returns Files that remain for organization.
 */
function filterDuplicateFiles(
  files: readonly IScannedFile[],
  skipped: readonly IScannedFile[],
  replaced: readonly IScannedFile[]
): IScannedFile[] {
  const duplicatePaths = collectDuplicatePaths(skipped, replaced);
  return duplicatePaths.length === 0 ? [...files] : removeDuplicateFiles(files, duplicatePaths);
}

/**
 * Handles duplicate replacement behavior before organization continues.
 * @param filteredFiles - Files still eligible for organization.
 * @param replacedFiles - Files marked for replacement or removal.
 * @param options - Replacement execution options.
 * @param logger - Logger used for status output.
 * @returns Files that continue to organization.
 */
export function handleReplacedDuplicates(
  filteredFiles: readonly IScannedFile[],
  replacedFiles: readonly IScannedFile[],
  options: Readonly<{ deleteDuplicates: boolean }>,
  logger: Readonly<Logger>
): IScannedFile[] {
  if (options.deleteDuplicates) {
    for (const file of replacedFiles) {
      FileSystemUtils.unlinkSync(file.originalPath);
    }
  }

  logger.info(
    `${options.deleteDuplicates ? 'Removed' : 'Would remove'} ${replacedFiles.length} duplicate files before organization`
  );
  return [...filteredFiles];
}

/**
 * Handles duplicate skipping behavior before organization continues.
 * @param filteredFiles - Files still eligible for organization.
 * @param groupCount - Number of duplicate groups encountered.
 * @param skippedCount - Number of skipped duplicate files.
 * @param logger - Logger used for status output.
 * @returns Files that continue to organization.
 */
export function handleSkippedDuplicates(
  filteredFiles: readonly IScannedFile[],
  groupCount: number,
  skippedCount: number,
  logger: Readonly<Logger>
): IScannedFile[] {
  logger.info(`Kept ${groupCount} primary files, filtered out ${skippedCount} duplicate files`);
  return [...filteredFiles];
}

/**
 * Filters out files whose original paths appear in the duplicate path list.
 * @param files - Files considered for organization.
 * @param duplicatePaths - Duplicate file paths to exclude.
 * @returns Files that remain for organization.
 */
function removeDuplicateFiles(
  files: readonly IScannedFile[],
  duplicatePaths: readonly string[]
): IScannedFile[] {
  const duplicatePathSet = new Set<string>(duplicatePaths);
  let uniqueFiles: readonly IScannedFile[] = [];

  for (const file of files) {
    if (!duplicatePathSet.has(file.originalPath)) {
      uniqueFiles = [...uniqueFiles, file];
    }
  }

  return [...uniqueFiles];
}
