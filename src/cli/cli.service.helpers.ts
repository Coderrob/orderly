import * as path from 'node:path';

import chalk from 'chalk';

import type { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileOrganizer } from '../organizer/file-organizer';
import { ManifestGenerator } from '../organizer/manifest-generator';
import { FileOperationType, type IOrganizationResult } from '../organizer/types';
import { FileScanner } from '../scanner/file-scanner';
import type { IScannedFile } from '../scanner/interfaces';

import { CLI_CONSTANTS } from './constants';

const RESULT_DIVIDER_WIDTH = 50;
const FILE_CATEGORIES_HEADING = '\nFile categories found:';
const SCAN_CATEGORIES_HEADING = '\nFile categories:';
const MOVE_LABEL = 'Move';
const RENAME_LABEL = 'Rename';
const MOVE_RENAME_LABEL = 'Move + Rename';

export interface IOperationCounts {
  readonly [FileOperationType.MOVE]: number;
  readonly [FileOperationType.RENAME]: number;
  readonly [FileOperationType.MOVE_RENAME]: number;
}

export interface IScanDisplayContext {
  readonly scanner: Readonly<FileScanner>;
  readonly files: readonly IScannedFile[];
  readonly config: Readonly<OrderlyConfig>;
  readonly logger: Readonly<Logger>;
  readonly targetDir: string;
}

/**
 * Counts move operations in a planned operation list.
 * @param operations - Planned operations.
 * @returns Number of move operations.
 */
function countMoveOperations(
  operations: ReadonlyArray<Readonly<{ type: FileOperationType }>>
): number {
  return operations.filter(isMoveOperation).length;
}

/**
 * Counts move-and-rename operations in a planned operation list.
 * @param operations - Planned operations.
 * @returns Number of move-and-rename operations.
 */
function countMoveRenameOperations(
  operations: ReadonlyArray<Readonly<{ type: FileOperationType }>>
): number {
  return operations.filter(isMoveRenameOperation).length;
}

/**
 * Counts operations by operation type.
 * @param operations - Planned operations.
 * @returns Counts keyed by operation type.
 */
function countOperationTypes(
  operations: ReadonlyArray<Readonly<{ type: FileOperationType }>>
): IOperationCounts {
  return {
    [FileOperationType.MOVE]: countMoveOperations(operations),
    [FileOperationType.RENAME]: countRenameOperations(operations),
    [FileOperationType.MOVE_RENAME]: countMoveRenameOperations(operations)
  };
}

/**
 * Counts rename operations in a planned operation list.
 * @param operations - Planned operations.
 * @returns Number of rename operations.
 */
function countRenameOperations(
  operations: ReadonlyArray<Readonly<{ type: FileOperationType }>>
): number {
  return operations.filter(isRenameOperation).length;
}

/**
 * Displays category and operation summaries for scan output.
 * @param context - Scan display context.
 */
export function displayScanResults(context: Readonly<IScanDisplayContext>): void {
  printScanSummary(context.scanner, context.files);

  const organizer = new FileOrganizer(context.config, context.logger, context.targetDir);
  const operations = organizer.planOperations(context.files);
  printOperationCounts(operations);
}

/**
 * Returns whether an operation is a move.
 * @param this - Unused detached function context.
 * @param operation - Operation to inspect.
 * @returns True when the operation is a move.
 */
function isMoveOperation(this: void, operation: Readonly<{ type: FileOperationType }>): boolean {
  return operation.type === FileOperationType.MOVE;
}

/**
 * Returns whether an operation is a move-and-rename.
 * @param this - Unused detached function context.
 * @param operation - Operation to inspect.
 * @returns True when the operation is a move-and-rename.
 */
function isMoveRenameOperation(
  this: void,
  operation: Readonly<{ type: FileOperationType }>
): boolean {
  return operation.type === FileOperationType.MOVE_RENAME;
}

/**
 * Returns whether an operation is a rename.
 * @param this - Unused detached function context.
 * @param operation - Operation to inspect.
 * @returns True when the operation is a rename.
 */
function isRenameOperation(this: void, operation: Readonly<{ type: FileOperationType }>): boolean {
  return operation.type === FileOperationType.RENAME;
}

/**
 * Logs a category summary for scanned files.
 * @param scanner - Scanner used to calculate category totals.
 * @param files - Files to summarize.
 * @param logger - Logger used for output.
 */
export function logFileSummary(
  scanner: Readonly<FileScanner>,
  files: readonly IScannedFile[],
  logger: Readonly<Logger>
): void {
  const summary = scanner.getCategorySummary(files);
  logger.info(FILE_CATEGORIES_HEADING);
  for (const [category, count] of summary) {
    logger.info(`  ${category}: ${count} files`);
  }
}

/**
 * Logs the high-level organization result summary.
 * @param result - Organization result to report.
 * @param logger - Logger used for output.
 */
export function logResults(result: Readonly<IOrganizationResult>, logger: Readonly<Logger>): void {
  logger.info(`\n${'='.repeat(RESULT_DIVIDER_WIDTH)}`);
  logger.info(chalk.green.bold(`✓ Completed: ${result.successful} operations`));
  if (result.failed > 0) {
    logger.error(chalk.red.bold(`✗ Failed: ${result.failed} operations`));
  }
}

/**
 * Prints operation totals for scan output.
 * @param operations - Planned operations.
 */
function printOperationCounts(
  operations: ReadonlyArray<Readonly<{ type: FileOperationType }>>
): void {
  const counts = countOperationTypes(operations);
  console.log(chalk.bold(`\nOperations needed: ${operations.length}`));
  console.log(`  ${MOVE_LABEL}: ${counts[FileOperationType.MOVE]}`);
  console.log(`  ${RENAME_LABEL}: ${counts[FileOperationType.RENAME]}`);
  console.log(`  ${MOVE_RENAME_LABEL}: ${counts[FileOperationType.MOVE_RENAME]}`);
}

/**
 * Prints the scanned file category summary.
 * @param scanner - Scanner used to calculate category totals.
 * @param files - Files to summarize.
 */
function printScanSummary(scanner: Readonly<FileScanner>, files: readonly IScannedFile[]): void {
  const summary = scanner.getCategorySummary(files);
  console.log(chalk.bold(SCAN_CATEGORIES_HEADING));
  for (const [category, count] of summary) {
    console.log(`  ${chalk.cyan(category)}: ${count} files`);
  }
}

/**
 * Writes JSON and Markdown manifest outputs for an organization run.
 * @param result - Organization result used to generate manifests.
 * @param logger - Logger used for output.
 */
export function saveManifests(
  result: Readonly<IOrganizationResult>,
  logger: Readonly<Logger>
): void {
  const manifestGenerator = new ManifestGenerator(logger);
  const manifest = manifestGenerator.generate(result, result.errors);
  const manifestDir = path.join(process.cwd(), CLI_CONSTANTS.ORDERLY_DIR);

  manifestGenerator.save(manifest, path.join(manifestDir, CLI_CONSTANTS.MANIFEST_JSON));
  manifestGenerator.saveMarkdown(manifest, path.join(manifestDir, CLI_CONSTANTS.MANIFEST_MD));
  logger.info(`\nManifest files created in: ${manifestDir}`);
}
