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
    const wastedBytes = calculateTotalWastedBytes(result.groups);
    const headerLines = [
      '# Orderly Dedupe Report',
      '',
      `- Total files: ${result.totalFiles}`,
      `- Duplicate groups: ${result.groups.length}`,
      `- Duplicate files: ${result.totalDuplicates}`,
      `- Reclaimable bytes: ${wastedBytes}`,
      `- Strategies used: ${result.strategiesUsed.join(', ') || 'none'}`,
      ''
    ];

    const groupLines = result.groups.flatMap(formatGroupLines);
    return [...headerLines, ...groupLines].join('\n');
  }
}

/**
 * Calculates reclaimable bytes for a duplicate group.
 * @param group - Duplicate group.
 * @returns Reclaimable bytes.
 */
function calculateGroupWastedBytes(group: Readonly<IDuplicateGroup>): number {
  if (!group.primary || group.files.length <= 1) {
    return 0;
  }

  return group.files.reduce(sumFileSizes, 0) - (group.primary?.size ?? 0);
}

/**
 * Calculates reclaimable bytes across all duplicate groups.
 * @param groups - Duplicate groups.
 * @returns Reclaimable bytes.
 */
function calculateTotalWastedBytes(groups: readonly IDuplicateGroup[]): number {
  return groups.reduce(sumGroupWastedBytes, 0);
}

/**
 * Formats a single duplicate file row for the Markdown table.
 * @param file - Duplicate file.
 * @returns Markdown table row.
 */
function formatFileLine(
  file: Readonly<{ filename: string; originalPath: string; size: number }>
): string {
  return `| \`${file.filename}\` | \`${file.originalPath}\` | ${file.size} |`;
}

/**
 * Formats a single duplicate group.
 * @param group - Duplicate group to format.
 * @returns Markdown lines.
 */
function formatGroupLines(group: Readonly<IDuplicateGroup>): readonly string[] {
  const groupStrategies = group.strategies?.join(', ') ?? group.strategy;
  const fileLines = group.files.map(formatFileLine);

  return [
    `## Group: ${group.key}`,
    '',
    `- Strategy: ${group.strategy}`,
    `- Shared strategies: ${groupStrategies}`,
    `- Primary: \`${group.primary?.originalPath ?? 'n/a'}\``,
    `- Reclaimable bytes: ${calculateGroupWastedBytes(group)}`,
    '',
    '| File | Path | Size |',
    '| --- | --- | ---: |',
    ...fileLines,
    ''
  ];
}

/**
 * Adds one file size to a running byte total.
 * @param total - Running total.
 * @param file - Duplicate file.
 * @returns Updated total.
 */
function sumFileSizes(total: number, file: Readonly<{ size: number }>): number {
  return total + file.size;
}

/**
 * Adds one group's wasted bytes to the running total.
 * @param total - Running total.
 * @param group - Duplicate group.
 * @returns Updated total.
 */
function sumGroupWastedBytes(total: number, group: Readonly<IDuplicateGroup>): number {
  return total + calculateGroupWastedBytes(group);
}
