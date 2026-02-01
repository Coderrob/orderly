import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';
import type { IFileOperation, IOrganizationResult, IFileError } from './types';

export interface IManifestBuilder {
  build(result: IOrganizationResult, errors: IFileError[]): Manifest;
}

export class ManifestBuilder implements IManifestBuilder {
  /**
   *
   * @param result
   * @param errors
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
   *
   * @param operations
   * @param errors
   * @param timestamp
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
