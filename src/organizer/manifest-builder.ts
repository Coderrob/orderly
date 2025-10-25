import { FileOperation, OrganizationResult } from './file-organizer';
import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';

export class ManifestBuilder {
  build(result: OrganizationResult, errors: Array<{ file: string; error: string }>): Manifest {
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

  private buildEntries(
    operations: FileOperation[],
    errors: Array<{ file: string; error: string }>,
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
