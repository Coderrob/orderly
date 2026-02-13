import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';
import type { IFileOperation, IOrganizationResult, IFileError } from './types';

export interface IManifestBuilder {
  build(result: IOrganizationResult, errors: IFileError[]): Manifest;
}

export class ManifestBuilder implements IManifestBuilder {
  /**
   * Builds a manifest from organization results and errors
   * @param result - The organization result containing operations and counts
   * @param errors - Array of file errors that occurred during organization
   * @returns A complete manifest with metadata and operation entries
   */
  build(result: IOrganizationResult, errors: IFileError[]): Manifest {
    const timestamp = new Date().toISOString();
    const entries = this.buildEntries(result.operations, errors, timestamp);

    return {
      generatedAt: timestamp,
      totalOperations: result.operations.length,
      successful: result.successful,
      failed: result.failed,
      entries
    };
  }

  /**
   * Builds manifest entries from operations and errors
   * @param operations - Array of file operations to create entries for
   * @param errors - Array of file errors to match with operations
   * @param timestamp - ISO timestamp to assign to each entry
   * @returns Array of manifest entries with status and error information
   */
  private buildEntries(
    operations: IFileOperation[],
    errors: IFileError[],
    timestamp: string
  ): ManifestEntry[] {
    return operations.map(operation => {
      const error = errors.find(e => e.file === operation.originalPath);
      return {
        timestamp,
        operation,
        status: error ? OperationStatus.FAILED : OperationStatus.SUCCESS,
        error: error?.error
      };
    });
  }
}
