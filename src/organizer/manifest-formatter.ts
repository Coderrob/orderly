import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';

export class ManifestFormatter {
  format(manifest: Manifest): string {
    const lines: string[] = [
      '# Orderly File Organization Manifest\n',
      `**Generated:** ${manifest.generatedAt}\n`,
      `**Total Operations:** ${manifest.totalOperations}`,
      `**Successful:** ${manifest.successful}`,
      `**Failed:** ${manifest.failed}\n`
    ];

    if (manifest.entries.length > 0) {
      lines.push('## Operations\n', ...this.formatEntries(manifest.entries));
    }

    return lines.join('\n');
  }

  private formatEntries(entries: ManifestEntry[]): string[] {
    const lines: string[] = [];

    for (const entry of entries) {
      const status = entry.status === OperationStatus.SUCCESS ? '✓' : '✗';
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
