import * as fs from 'fs';
import * as path from 'path';
import { FileOperation, OrganizationResult } from './file-organizer';
import { Logger } from '../logger/logger';

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
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  generate(result: OrganizationResult, errors: Array<{ file: string; error: string }>): Manifest {
    const timestamp = new Date().toISOString();
    const entries: ManifestEntry[] = [];

    for (const operation of result.operations) {
      const error = errors.find(e => e.file === operation.originalPath);
      entries.push({
        timestamp,
        operation,
        status: error ? 'failed' : 'success',
        error: error?.error
      });
    }

    return {
      generatedAt: timestamp,
      totalOperations: result.operations.length,
      successful: result.successful,
      failed: result.failed,
      entries
    };
  }

  save(manifest: Manifest, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');
    this.logger.info(`Manifest saved to: ${outputPath}`);
  }

  saveMarkdown(manifest: Manifest, outputPath: string): void {
    const lines: string[] = [];
    lines.push('# Orderly File Organization Manifest\n');
    lines.push(`**Generated:** ${manifest.generatedAt}\n`);
    lines.push(`**Total Operations:** ${manifest.totalOperations}`);
    lines.push(`**Successful:** ${manifest.successful}`);
    lines.push(`**Failed:** ${manifest.failed}\n`);

    if (manifest.entries.length > 0) {
      lines.push('## Operations\n');
      for (const entry of manifest.entries) {
        const status = entry.status === 'success' ? '✓' : '✗';
        lines.push(`### ${status} ${entry.operation.type.toUpperCase()}`);
        lines.push(`- **From:** \`${entry.operation.originalPath}\``);
        lines.push(`- **To:** \`${entry.operation.newPath}\``);
        lines.push(`- **Reason:** ${entry.operation.reason}`);
        if (entry.error) {
          lines.push(`- **Error:** ${entry.error}`);
        }
        lines.push('');
      }
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    this.logger.info(`Markdown manifest saved to: ${outputPath}`);
  }
}
