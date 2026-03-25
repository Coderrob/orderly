import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

import { ManifestBuilder } from './manifest-builder';
import { ManifestFormatter } from './manifest-formatter';
import type { IFileOperation, IOrganizationResult, IFileError } from './types';

const JSON_INDENT_SPACES = 2;

export enum OperationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface IManifestEntry {
  timestamp: string;
  operation: IFileOperation;
  status: OperationStatus;
  error?: string;
}

export type ManifestEntry = IManifestEntry;

export interface IManifest {
  generatedAt: string;
  totalOperations: number;
  successful: number;
  failed: number;
  skipped: number;
  entries: IManifestEntry[];
}

export type Manifest = IManifest;

export interface IManifestGenerator {
  generate(result: Readonly<IOrganizationResult>, errors: readonly IFileError[]): IManifest;
  save(manifest: Readonly<IManifest>, outputPath: string): void;
  saveMarkdown(manifest: Readonly<IManifest>, outputPath: string): void;
}

export class ManifestGenerator implements IManifestGenerator {
  private readonly builder = new ManifestBuilder();
  private readonly formatter = new ManifestFormatter();

  /**
   * Creates a new ManifestGenerator instance
   * @param logger - Logger instance for recording manifest operations
   */
  constructor(private readonly logger: Readonly<Logger>) {}

  /**
   * Generates a manifest from organization results and errors
   * @param result - The organization result containing operations and counts
   * @param errors - Array of file errors that occurred during organization
   * @returns A complete manifest with all operation entries
   */
  generate(result: Readonly<IOrganizationResult>, errors: readonly IFileError[]): IManifest {
    return this.builder.build(result, errors);
  }

  /**
   * Saves a manifest to a file in JSON format
   * @param manifest - The manifest to save
   * @param outputPath - The file path where the manifest should be saved
   */
  save(manifest: Readonly<IManifest>, outputPath: string): void {
    const content = JSON.stringify(manifest, null, JSON_INDENT_SPACES);
    FileSystemUtils.writeFileSync(outputPath, content);
    this.logger.info(`Manifest saved to: ${outputPath}`);
  }

  /**
   * Saves a manifest to a file in Markdown format
   * @param manifest - The manifest to save
   * @param outputPath - The file path where the markdown manifest should be saved
   */
  saveMarkdown(manifest: Readonly<IManifest>, outputPath: string): void {
    const content = this.formatter.format(manifest);
    FileSystemUtils.writeFileSync(outputPath, content);
    this.logger.info(`Markdown manifest saved to: ${outputPath}`);
  }
}
