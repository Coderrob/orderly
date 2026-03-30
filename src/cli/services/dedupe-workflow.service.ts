import { type IDedupeResult } from '../../dedupe';
import { FileScanner } from '../../scanner/file-scanner';
import {
  createReportWrites,
  getOriginalPath,
  resolveQuarantinePath,
  resolveReportPaths,
  shouldDeleteDuplicates,
  toDeleteError,
  type IDedupeCommandContext
} from '../commands/dedupe.command.helpers';
import type { IDedupeReportService } from '../interfaces';

import { DedupeRuntime } from './dedupe-runtime.service';
import { deleteFilePaths, quarantineFilePaths } from './workflow-file-operations';

export interface IDedupeWorkflowContext extends IDedupeCommandContext {
  readonly scanner: FileScanner;
}

export interface IDedupeWorkflowResult {
  readonly deleteErrors: readonly string[];
  readonly result: Readonly<IDedupeResult>;
}

/**
 * Runs the standalone dedupe workflow after CLI input resolution.
 */
export class DedupeWorkflow {
  /**
   * Creates a new DedupeWorkflow instance.
   * @param reportWriter - Dedupe report writer.
   * @param dedupeRuntime - Shared dedupe runtime helper.
   */
  constructor(
    private readonly reportWriter: Readonly<IDedupeReportService>,
    private readonly dedupeRuntime: Readonly<DedupeRuntime> = new DedupeRuntime()
  ) {}

  /**
   * Executes the dedupe workflow.
   * @param commandContext - Dedupe execution context.
   * @returns Dedupe result with delete error details.
   */
  async run(
    commandContext: Readonly<IDedupeWorkflowContext>
  ): Promise<Readonly<IDedupeWorkflowResult>> {
    const files = await commandContext.scanner.scan(commandContext.targetDir);
    const result = await this.dedupeRuntime.findDuplicates(commandContext.dedupeConfig, files);
    const deleteErrors = await this.applyReplaceActionIfNeeded(commandContext, result);
    await this.writeReportsIfRequested(commandContext, result);
    return { deleteErrors, result };
  }

  /**
   * Applies file replacement for REPLACE action when not in dry-run mode.
   * @param commandContext - Dedupe command context.
   * @param result - Dedupe result.
   * @returns Deletion error messages.
   */
  private async applyReplaceActionIfNeeded(
    commandContext: Readonly<IDedupeCommandContext>,
    result: Readonly<IDedupeResult>
  ): Promise<readonly string[]> {
    if (!shouldDeleteDuplicates(commandContext.dedupeConfig.action, commandContext.options)) {
      return [];
    }

    const outcome = await this.dedupeRuntime.applyReplaceAction(
      commandContext.dedupeConfig,
      result
    );
    return commandContext.options.quarantineDir
      ? this.quarantineDuplicateFiles(
          outcome.replaced.map(getOriginalPath),
          commandContext.options.quarantineDir
        )
      : this.deleteDuplicateFiles(outcome.replaced.map(getOriginalPath));
  }

  /**
   * Deletes duplicate files and captures any failures.
   * @param filePaths - File paths to delete.
   * @returns Error messages.
   */
  private deleteDuplicateFiles(filePaths: readonly string[]): readonly string[] {
    return deleteFilePaths(filePaths, toDeleteError);
  }

  /**
   * Moves duplicate files into a quarantine directory.
   * @param filePaths - File paths to quarantine.
   * @param quarantineDir - Destination quarantine directory.
   * @returns Error messages.
   */
  private quarantineDuplicateFiles(
    filePaths: readonly string[],
    quarantineDir: string
  ): readonly string[] {
    return quarantineFilePaths(filePaths, quarantineDir, resolveQuarantinePath, toDeleteError);
  }

  /**
   * Writes report files when requested or when report action is active.
   * @param commandContext - Dedupe command context.
   * @param result - Dedupe result.
   * @returns Promise resolving after report generation.
   */
  private async writeReportsIfRequested(
    commandContext: Readonly<IDedupeCommandContext>,
    result: Readonly<IDedupeResult>
  ): Promise<void> {
    const reportPaths = resolveReportPaths(commandContext);
    if (!reportPaths.jsonPath && !reportPaths.markdownPath) {
      return;
    }

    await Promise.all(createReportWrites(this.reportWriter, reportPaths, result));
  }
}
