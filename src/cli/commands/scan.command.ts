import { FileScanner } from '../../scanner/file-scanner';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
import {
  IAutoConfigContext
} from '../decorators/auto-config-discovery.decorator';
import type {
  IConfigService,
  IDirectoryValidator,
  ICommandResult,
  IScanHandler,
  IScanOptions
} from '../interfaces';
import { ScanWorkflow } from '../services';

import {
  createCommandContextBase,
  createScannerCommandContext
} from './command-context.helpers';
import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';
import {
  createWrappedAutoConfigCommand
} from './command-wrapper.helpers';

enum ScanOptionKey {
  AUTO_CONFIG = 'autoConfig',
  CONFIG = 'config',
  FORMAT = 'format',
  LOG_LEVEL = 'logLevel'
}

interface IScanContextDependencies {
  readonly configService: Readonly<IConfigService>;
  readonly directoryValidator: Readonly<IDirectoryValidator>;
}

interface IScanExecuteDependencies extends IScanContextDependencies {
  executeCore(
    directory: string,
    options: Readonly<IScanOptions>,
    context?: Readonly<IAutoConfigContext<IScanOptions>>
  ): Promise<ICommandResult>;
}

/**
 * Handler for the scan command.
 */
export class ScanHandler implements IScanHandler {
  public readonly execute: (
    directory: string,
    options: Readonly<IScanOptions>,
    context?: Readonly<IAutoConfigContext<IScanOptions>>
  ) => Promise<ICommandResult>;

  /**
   * Creates a new ScanHandler instance
   * @param configService - Service for loading and managing configuration
   * @param directoryValidator - Service for validating directory paths
   * @param workflow - Optional scan workflow override.
   */
  constructor(
    private readonly configService: Readonly<IConfigService>,
    private readonly directoryValidator: Readonly<IDirectoryValidator>,
    private readonly workflow: Readonly<ScanWorkflow> = new ScanWorkflow()
  ) {
    this.execute = createScanExecute({
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      executeCore: this.executeCore.bind(this)
    });
  }

  /**
   * Executes the scan command.
   * @param directory - Target directory to scan
   * @param options - Scan command options
   * @param context - Optional context injected by auto-config discovery.
   * @returns Promise resolving to command result
   */
  private async executeCore(
    directory: string,
    options: Readonly<IScanOptions>,
    context?: Readonly<IAutoConfigContext<IScanOptions>>
  ): Promise<ICommandResult> {
    const commandContext = this.createCommandContext(directory, options, context);
    const files = await this.workflow.run(commandContext, options.format);

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.SCAN_SUCCESS.replace('{0}', String(files.length)).replace(
        '{1}',
        commandContext.targetDir
      )
    };
  }

  /**
   * Creates the shared command context used during scan execution.
   * @param directory - Target directory to scan.
   * @param options - Scan command options.
   * @param context - Optional auto-config discovery context.
   * @returns Shared command context.
   */
  private createCommandContext(
    directory: string,
    options: Readonly<IScanOptions>,
    context?: Readonly<IAutoConfigContext<IScanOptions>>
  ): Readonly<{ scanner: FileScanner; targetDir: string }> {
    const commandContext = createScannerCommandContext(createCommandContextBase({
      directory,
      options,
      context,
      configService: this.configService,
      directoryValidator: this.directoryValidator
    }));
    return { scanner: commandContext.scanner, targetDir: commandContext.targetDir };
  }

}

/**
 * Creates normalized scan boolean options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized boolean options.
 */
function createScanBooleanOptions(value: object): Readonly<IScanOptions> {
  const autoConfig = getOptionalBooleanOption(value, ScanOptionKey.AUTO_CONFIG);
  return {
    ...(autoConfig === undefined ? {} : { autoConfig })
  };
}

/**
 * Creates the wrapped execute function for the scan handler.
 * @param handler - Scan handler instance.
 * @returns Wrapped execute function.
 */
function createScanExecute(
  handler: Readonly<IScanExecuteDependencies>
): (
  directory: string,
  options: Readonly<IScanOptions>,
  context?: Readonly<IAutoConfigContext<IScanOptions>>
) => Promise<ICommandResult> {
  return createWrappedAutoConfigCommand<IScanOptions>({
    commandName: 'scan',
    errorPrefix: COMMAND_MESSAGES.SCAN_FAILED,
    executeCore: handler.executeCore.bind(handler),
    normalizeDirectory: normalizeScanDirectory,
    normalizeOptions: normalizeScanOptions,
    service: handler
  });
}

/**
 * Creates normalized scan string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createScanStringOptions(value: object): Readonly<IScanOptions> {
  const config = getOptionalStringOption(value, ScanOptionKey.CONFIG);
  const format = getOptionalStringOption(value, ScanOptionKey.FORMAT);
  const logLevel = getOptionalStringOption(value, ScanOptionKey.LOG_LEVEL);
  return {
    ...(config ? { config } : {}),
    ...(format ? { format } : {}),
    ...(logLevel ? { logLevel } : {})
  };
}

/**
 * Normalizes an unknown directory argument to a scan directory string.
 * @param value - Candidate directory value.
 * @returns Directory string.
 */
function normalizeScanDirectory(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Normalizes an unknown value to scan command options.
 * @param value - Candidate options value.
 * @returns Scan command options.
 */
function normalizeScanOptions(value: unknown): Readonly<IScanOptions> {
  return normalizeObjectOptions<IScanOptions>(
    value,
    createScanBooleanOptions,
    createScanStringOptions
  );
}
