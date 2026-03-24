import { Clock } from '../utils/clock';

import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';
import type { IFileOperation, IOrganizationResult, IFileError, IFileSkip } from './types';

const MONOTONIC_TIMESTAMP_PRECISION = 3;

export interface IManifestBuilder {
  build(result: Readonly<IOrganizationResult>, errors: readonly IFileError[]): Manifest;
}

export class ManifestBuilder implements IManifestBuilder {
  /**
   * Builds a manifest from organization results and errors
   * @param result - The organization result containing operations and counts
   * @param errors - Array of file errors that occurred during organization
   * @returns A complete manifest with metadata and operation entries
   */
  build(result: Readonly<IOrganizationResult>, errors: readonly IFileError[]): Manifest {
    const timestamp = `t+${Clock.nowMonotonicMs().toFixed(MONOTONIC_TIMESTAMP_PRECISION)}ms`;
    const entries = this.buildEntries(
      result.operations,
      errors,
      result.skippedOperations ?? [],
      timestamp
    );

    return {
      generatedAt: timestamp,
      totalOperations: result.operations.length,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped ?? 0,
      entries
    };
  }

  /**
   * Builds manifest entries from operations and errors
   * @param operations - Array of file operations to create entries for
   * @param errors - Array of file errors to match with operations
   * @param skippedOperations - Array of skipped operations that should be marked as skipped in the manifest
   * @param timestamp - ISO timestamp to assign to each entry
   * @returns Array of manifest entries with status and error information
   */
  private buildEntries(
    operations: readonly IFileOperation[],
    errors: readonly IFileError[],
    skippedOperations: readonly IFileSkip[],
    timestamp: string
  ): ManifestEntry[] {
    let entries: readonly ManifestEntry[] = [];

    for (const operation of operations) {
      entries = [...entries, this.buildEntry(operation, errors, skippedOperations, timestamp)];
    }

    return [...entries];
  }

  /**
   * Builds one manifest entry for an operation.
   * @param operation - File operation being represented.
   * @param errors - Errors that occurred during organization.
   * @param skippedOperations - Skipped operations recorded during organization.
   * @param timestamp - Shared manifest timestamp.
   * @returns Manifest entry for the operation.
   */
  private buildEntry(
    operation: Readonly<IFileOperation>,
    errors: readonly IFileError[],
    skippedOperations: readonly IFileSkip[],
    timestamp: string
  ): ManifestEntry {
    const skipped = findSkippedOperation(skippedOperations, operation.originalPath);
    if (skipped) {
      return {
        timestamp,
        operation,
        status: OperationStatus.SKIPPED,
        error: skipped.reason
      };
    }

    const error = findFileError(errors, operation.originalPath);
    return {
      timestamp,
      operation,
      status: error ? OperationStatus.FAILED : OperationStatus.SUCCESS,
      error: error?.error
    };
  }
}

/**
 * Finds the error recorded for an operation path.
 * @param errors - Recorded file errors.
 * @param originalPath - Operation source path.
 * @returns Matching file error or undefined.
 */
function findFileError(
  errors: readonly IFileError[],
  originalPath: string
): Readonly<IFileError> | undefined {
  for (const error of errors) {
    if (error.file === originalPath) {
      return error;
    }
  }

  return undefined;
}

/**
 * Finds the skipped operation recorded for an operation path.
 * @param skippedOperations - Recorded skipped operations.
 * @param originalPath - Operation source path.
 * @returns Matching skipped operation or undefined.
 */
function findSkippedOperation(
  skippedOperations: readonly IFileSkip[],
  originalPath: string
): Readonly<IFileSkip> | undefined {
  for (const skippedOperation of skippedOperations) {
    if (skippedOperation.file === originalPath) {
      return skippedOperation;
    }
  }

  return undefined;
}
