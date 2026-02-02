import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

import { ManifestBuilder } from './manifest-builder';
import { ManifestFormatter } from './manifest-formatter';
import type { IFileOperation, IOrganizationResult, IFileError } from './types';

export enum OperationStatus {
  SUCCESS = 'success',
  FAILED = 'failed'
}

export interface ManifestEntry {
  timestamp: string;
  operation: IFileOperation;
  status: OperationStatus;
  error?: string;
}

export interface Manifest {
  generatedAt: string;
  totalOperations: number;
  successful: number;
  failed: number;
  entries: ManifestEntry[];
  // Backward compatibility: operations is an alias for entries
  operations?: ManifestEntry[];
}

export interface IManifestGenerator {
  generate(result: IOrganizationResult, errors: IFileError[]): Manifest;
  save(manifest: Manifest, outputPath: string): void;
  saveMarkdown(manifest: Manifest, outputPath: string): void;
}

export class ManifestGenerator implements IManifestGenerator {
  private readonly builder = new ManifestBuilder();
  private readonly formatter = new ManifestFormatter();

  /**
   *
   * @param logger
   */
  constructor(private readonly logger: Logger) {}

  /**
   *
   * @param result
   * @param errors
   */
  generate(result: IOrganizationResult, errors: IFileError[]): Manifest {
    const manifest = this.builder.build(result, errors);
    // Add operations property for backward compatibility
    manifest.operations = manifest.entries;
    return manifest;
  }

  /**
   *
   * @param manifest
   * @param outputPath
   */
  save(manifest: Manifest, outputPath: string): void {
    const content = JSON.stringify(manifest, null, 2);
    FileSystemUtils.writeFileSync(outputPath, content);
    this.logger.info(`Manifest saved to: ${outputPath}`);
  }

  /**
   *
   * @param manifest
   * @param outputPath
   */
  saveMarkdown(manifest: Manifest, outputPath: string): void {
    const content = this.formatter.format(manifest);
    FileSystemUtils.writeFileSync(outputPath, content);
    this.logger.info(`Markdown manifest saved to: ${outputPath}`);
  }
}
