import { FileSystemUtils } from '../../utils/file-system-utils';
import type { IDedupeReportWriter } from '../interfaces';
import type { IDedupeResult, IDuplicateGroup } from '../types';

const JSON_INDENT_SPACES = 2;

/**
 * Writes dedupe results as JSON and Markdown reports.
 */
export class DedupeReportWriter implements IDedupeReportWriter {
  /**
   * Writes a JSON dedupe report.
   * @param result - Dedupe result to write.
   * @param outputPath - Output file path.
   * @returns Promise resolving when the file is written.
   */
  write(result: Readonly<IDedupeResult>, outputPath: string): Promise<void> {
    FileSystemUtils.writeFileSync(outputPath, JSON.stringify(result, null, JSON_INDENT_SPACES));
    return Promise.resolve();
  }

  /**
   * Writes a Markdown dedupe report.
   * @param result - Dedupe result to write.
   * @param outputPath - Output file path.
   * @returns Promise resolving when the file is written.
   */
  writeMarkdown(result: Readonly<IDedupeResult>, outputPath: string): Promise<void> {
    FileSystemUtils.writeFileSync(outputPath, this.formatMarkdown(result));
    return Promise.resolve();
  }

  /**
   * Formats a Markdown dedupe report.
   * @param result - Dedupe result to format.
   * @returns Markdown report content.
   */
  private formatMarkdown(result: Readonly<IDedupeResult>): string {
    const headerLines = [
      '# Orderly Dedupe Report',
      '',
      `- Total files: ${result.totalFiles}`,
      `- Duplicate groups: ${result.groups.length}`,
      `- Duplicate files: ${result.totalDuplicates}`,
      `- Strategies used: ${result.strategiesUsed.join(', ') || 'none'}`,
      ''
    ];

    const groupLines = result.groups.flatMap(this.formatGroup.bind(this));
    return [...headerLines, ...groupLines].join('\n');
  }

  /**
   * Formats a single duplicate group.
   * @param group - Duplicate group to format.
   * @returns Markdown lines.
   */
  private formatGroup(group: Readonly<IDuplicateGroup>): readonly string[] {
    const fileLines = group.files.map(this.formatFileLine.bind(this));

    return [
      `## Group: ${group.key}`,
      '',
      `- Strategy: ${group.strategy}`,
      `- Primary: \`${group.primary?.originalPath ?? 'n/a'}\``,
      '',
      '| File | Path | Size |',
      '| --- | --- | ---: |',
      ...fileLines,
      ''
    ];
  }

  /**
   * Formats a single duplicate file row for the Markdown table.
   * @param file - Duplicate file.
   * @returns Markdown table row.
   */
  private formatFileLine(
    file: Readonly<{ filename: string; originalPath: string; size: number }>
  ): string {
    return `| \`${file.filename}\` | \`${file.originalPath}\` | ${file.size} |`;
  }
}
