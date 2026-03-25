import { EmptyDirectoryCleaner } from '../../cleaner/empty-directory-cleaner';
import type { ICleanOptions, ICleanResult } from '../../cleaner/interfaces';
import { Logger } from '../../logger/logger';
import { LogLevel } from '../../types';
import { ExitCode } from '../constants';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type {
  ICleanHandler,
  ICleanerService,
  ICommandResult,
  IDirectoryValidator
} from '../interfaces';

const CLEAN_FAILED_MESSAGE = 'Clean failed: ';

/**
 * Handler for the clean command.
 */
export class CleanHandler implements ICleanHandler {
  /**
   * Creates a clean command handler.
   * @param directoryValidator - Service for validating directory paths.
   * @param cleanerService - Service for removing empty directories.
   */
  constructor(
    private readonly directoryValidator: Readonly<IDirectoryValidator>,
    private readonly cleanerService: Readonly<ICleanerService> = new EmptyDirectoryCleaner()
  ) {}

  /**
   * Executes the clean command.
   * @param directory - Target directory to clean.
   * @param options - Clean command options.
   * @returns Command result payload.
   */
  @WithCommandTelemetry('clean')
  @HandleCommandErrors(CLEAN_FAILED_MESSAGE)
  execute(directory: string, options: Readonly<ICleanOptions>): Promise<ICommandResult> {
    const targetDirectory = this.directoryValidator.validate(directory);
    const logger = new Logger(this.resolveLogLevel(options.logLevel));
    const result = this.cleanerService.clean(targetDirectory, options);

    this.logCleanOutcome(result, logger);

    return Promise.resolve({
      success: result.errors.length === 0,
      exitCode: result.errors.length === 0 ? ExitCode.SUCCESS : ExitCode.ERROR,
      message: this.buildResultMessage(result)
    });
  }

  /**
   * Logs summary information for a clean run.
   * @param result - Clean result to log.
   * @param logger - Logger instance.
   */
  private logCleanOutcome(result: Readonly<ICleanResult>, logger: Readonly<Logger>): void {
    logger.info(this.buildResultMessage(result));

    for (const removedDirectory of result.removed) {
      logger.info(
        removedDirectory.dryRun
          ? `Would remove empty directory: ${removedDirectory.path}`
          : `Removed empty directory: ${removedDirectory.path}`
      );
    }

    for (const cleanError of result.errors) {
      logger.warn(`Could not remove directory '${cleanError.path}': ${cleanError.error}`);
    }
  }

  /**
   * Builds the user-facing clean summary message.
   * @param result - Clean result to summarize.
   * @returns Summary message.
   */
  private buildResultMessage(result: Readonly<ICleanResult>): string {
    const actionLabel =
      result.removed.length === 0
        ? 'No empty directories found'
        : result.removed[0].dryRun
          ? `Dry run: ${result.removedDirectories} empty directories would be removed`
          : `Removed ${result.removedDirectories} empty directories`;

    return `${actionLabel} (scanned ${result.scannedDirectories}, skipped ${result.skippedDirectories}, errors ${result.errors.length})`;
  }

  /**
   * Resolves an optional raw log level to a supported enum value.
   * @param logLevel - Raw log level value.
   * @returns Supported log level when valid.
   */
  private resolveLogLevel(logLevel?: string): LogLevel | undefined {
    switch (logLevel) {
      case LogLevel.DEBUG:
        return LogLevel.DEBUG;
      case LogLevel.INFO:
        return LogLevel.INFO;
      case LogLevel.WARN:
        return LogLevel.WARN;
      case LogLevel.ERROR:
        return LogLevel.ERROR;
      default:
        return undefined;
    }
  }
}
