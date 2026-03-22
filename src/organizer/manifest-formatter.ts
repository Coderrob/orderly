import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';

export interface IManifestFormatter {
  format(manifest: Manifest): string;
}

export class ManifestFormatter implements IManifestFormatter {
  /**
   * Formats a manifest into Markdown format
   * @param manifest - The manifest to format
   * @returns Markdown-formatted string representation of the manifest
   */
  format(manifest: Manifest): string {
    const lines: string[] = [
      '# Orderly File Organization Manifest\n',
      `**Generated:** ${manifest.generatedAt}\n`,
      `**Total Operations:** ${manifest.totalOperations}`,
      `**Successful:** ${manifest.successful}`,
      `**Failed:** ${manifest.failed}`,
      `**Skipped:** ${manifest.skipped}\n`
    ];

    if (manifest.entries.length > 0) {
      lines.push('## Operations\n', ...this.formatEntries(manifest.entries));
    }

    return lines.join('\n');
  }

  /**
   * Formats manifest entries into Markdown list items
   * @param entries - Array of manifest entries to format
   * @returns Array of formatted Markdown strings for each entry
   */
  private formatEntries(entries: ManifestEntry[]): string[] {
    const lines: string[] = [];

    for (const entry of entries) {
      let status = '↷';
      if (entry.status === OperationStatus.SUCCESS) {
        status = '✓';
      } else if (entry.status === OperationStatus.FAILED) {
        status = '✗';
      }
      const entryLines = [
        `### ${status} ${entry.operation.type.toUpperCase()}`,
        `- **From:** \`${entry.operation.originalPath}\``,
        `- **To:** \`${entry.operation.newPath}\``,
        `- **Reason:** ${entry.operation.reason}`
      ];

      if (entry.error) {
        entryLines.push(`- **Error:** ${entry.error}`);
      }
      entryLines.push('');

      lines.push(...entryLines);
    }

    return lines;
  }
}
