import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';

export interface IManifestFormatter {
  format(manifest: Readonly<Manifest>): string;
}

export class ManifestFormatter implements IManifestFormatter {
  /**
   * Formats a manifest into Markdown format
   * @param manifest - The manifest to format
   * @returns Markdown-formatted string representation of the manifest
   */
  format(manifest: Readonly<Manifest>): string {
    const headerLines = [
      '# Orderly File Organization Manifest\n',
      `**Generated:** ${manifest.generatedAt}\n`,
      `**Total Operations:** ${manifest.totalOperations}`,
      `**Successful:** ${manifest.successful}`,
      `**Failed:** ${manifest.failed}`,
      `**Skipped:** ${manifest.skipped}\n`
    ];

    const operationLines =
      manifest.entries.length > 0
        ? ['## Operations\n', ...this.formatEntries(manifest.entries)]
        : [];

    return [...headerLines, ...operationLines].join('\n');
  }

  /**
   * Formats manifest entries into Markdown list items
   * @param entries - Array of manifest entries to format
   * @returns Array of formatted Markdown strings for each entry
   */
  private formatEntries(entries: readonly Readonly<ManifestEntry>[]): string[] {
    if (entries.length === 0) {
      return [];
    }

    const [firstEntry, ...remainingEntries] = entries;

    return [...this.mapEntryToLines(firstEntry), ...this.formatEntries(remainingEntries)];
  }

  /**
   * Maps a manifest entry to its markdown lines.
   * @param entry - Manifest entry to map
   * @returns Formatted markdown lines
   */
  private mapEntryToLines(entry: Readonly<ManifestEntry>): string[] {
    return this.formatEntry(entry);
  }

  /**
   * Formats one manifest entry block.
   * @param entry - Manifest entry to format
   * @returns Formatted markdown lines for one entry
   */
  private formatEntry(entry: Readonly<ManifestEntry>): string[] {
    const baseLines = [
      `### ${this.getStatusSymbol(entry.status)} ${entry.operation.type.toUpperCase()}`,
      `- **From:** \`${entry.operation.originalPath}\``,
      `- **To:** \`${entry.operation.newPath}\``,
      `- **Reason:** ${entry.operation.reason}`
    ];
    const errorLines = entry.error ? [`- **Error:** ${entry.error}`] : [];

    return [...baseLines, ...errorLines, ''];
  }

  /**
   * Returns a symbol representing operation status.
   * @param status - Operation status value
   * @returns Status symbol
   */
  private getStatusSymbol(status: Readonly<OperationStatus>): string {
    if (status === OperationStatus.SUCCESS) {
      return '✓';
    }

    if (status === OperationStatus.FAILED) {
      return '✗';
    }

    return '↷';
  }
}
