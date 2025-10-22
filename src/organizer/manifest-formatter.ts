import { Manifest, ManifestEntry } from './manifest-generator';

export class ManifestFormatter {
  format(manifest: Manifest): string {
    const lines: string[] = [];
    lines.push('# Orderly File Organization Manifest\n');
    lines.push(`**Generated:** ${manifest.generatedAt}\n`);
    lines.push(`**Total Operations:** ${manifest.totalOperations}`);
    lines.push(`**Successful:** ${manifest.successful}`);
    lines.push(`**Failed:** ${manifest.failed}\n`);

    if (manifest.entries.length > 0) {
      lines.push('## Operations\n');
      lines.push(...this.formatEntries(manifest.entries));
    }

    return lines.join('\n');
  }

  private formatEntries(entries: ManifestEntry[]): string[] {
    const lines: string[] = [];

    for (const entry of entries) {
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

    return lines;
  }
}
