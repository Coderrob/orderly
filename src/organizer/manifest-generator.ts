import { FileOperation, OrganizationResult } from './file-organizer';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';
import { ManifestBuilder } from './manifest-builder';
import { ManifestFormatter } from './manifest-formatter';

export interface ManifestEntry {
  timestamp: string;
  operation: FileOperation;
  status: 'success' | 'failed';
  error?: string;
}

export interface Manifest {
  generatedAt: string;
  totalOperations: number;
  successful: number;
  failed: number;
  entries: ManifestEntry[];
}

export class ManifestGenerator {
  private builder = new ManifestBuilder();
  private formatter = new ManifestFormatter();

  constructor(private logger: Logger) {}

  generate(result: OrganizationResult, errors: Array<{ file: string; error: string }>): Manifest {
    return this.builder.build(result, errors);
  }

  save(manifest: Manifest, outputPath: string): void {
    const content = JSON.stringify(manifest, null, 2);
    FileSystemUtils.writeFile(outputPath, content);
    this.logger.info(`Manifest saved to: ${outputPath}`);
  }

  saveMarkdown(manifest: Manifest, outputPath: string): void {
    const content = this.formatter.format(manifest);
    FileSystemUtils.writeFile(outputPath, content);
    this.logger.info(`Markdown manifest saved to: ${outputPath}`);
  }
}
