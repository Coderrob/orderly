import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

import { ManifestBuilder } from './manifest-builder';
import { ManifestFormatter } from './manifest-formatter';
import type { IFileOperation, IOrganizationResult, IFileError } from './types';

export enum OperationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped'
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
  skipped: number;
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
   * Creates a new ManifestGenerator instance
   * @param logger - Logger instance for recording manifest operations
   */
  constructor(private readonly logger: Logger) {}

  /**
   * Generates a manifest from organization results and errors
   * @param result - The organization result containing operations and counts
   * @param errors - Array of file errors that occurred during organization
   * @returns A complete manifest with all operation entries and backward-compatible operations property
   */
  generate(result: IOrganizationResult, errors: IFileError[]): Manifest {
    const manifest = this.builder.build(result, errors);
    // Add operations property for backward compatibility (shallow copy of entries).
    // Note: ManifestEntry objects are shared between entries and operations - treat them as immutable.
    manifest.operations = [...manifest.entries];
    return manifest;
  }

  /**
   * Saves a manifest to a file in JSON format
   * @param manifest - The manifest to save
   * @param outputPath - The file path where the manifest should be saved
   */
  save(manifest: Manifest, outputPath: string): void {
    const content = JSON.stringify(manifest, null, 2);
    FileSystemUtils.writeFileSync(outputPath, content);
    this.logger.info(`Manifest saved to: ${outputPath}`);
  }

  /**
   * Saves a manifest to a file in Markdown format
   * @param manifest - The manifest to save
   * @param outputPath - The file path where the markdown manifest should be saved
   */
  saveMarkdown(manifest: Manifest, outputPath: string): void {
    const content = this.formatter.format(manifest);
    FileSystemUtils.writeFileSync(outputPath, content);
    this.logger.info(`Markdown manifest saved to: ${outputPath}`);
  }
}
