import { type OrderlyConfig } from '../../config/types';
import { type IDedupeResult } from '../../dedupe';
import { FileScanner } from '../../scanner/file-scanner';
import { COMMAND_MESSAGES, ExitCode } from '../constants';
import {
  IAutoConfigContext
} from '../decorators/auto-config-discovery.decorator';
import type {
  IConfigService,
  IDedupeCommandOptions,
  IDedupeHandler,
  IDedupeReportService,
  IDirectoryValidator,
  ICommandResult
} from '../interfaces';
import { DedupeWorkflow } from '../services';

import {
  createMappedCommandContextBase,
  createScannerCommandContext,
  normalizeCommandContextOptions
} from './command-context.helpers';
import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';
import {
  createWrappedAutoConfigCommand
} from './command-wrapper.helpers';
import {
  createDedupeConfigOverrides,
  normalizeDedupeCommandOptions,
  resolveDedupeConfig,
  validateReplaceSafety,
  type IDedupeCommandContext,
  type IDedupeCommandInput,
  type IDeleteSafetyContext
} from './dedupe.command.helpers';

enum DedupeOptionKey {
  ACTION = 'action',
  AUTO_CONFIG = 'autoConfig',
  CONFIG = 'config',
  CONFIRM_REPLACE = 'confirmReplace',
  DRY_RUN = 'dryRun',
  LOG_LEVEL = 'logLevel',
  PRESET = 'preset',
  QUARANTINE_DIR = 'quarantineDir',
  REPORT_JSON = 'reportJson',
  REPORT_MARKDOWN = 'reportMarkdown'
}

interface IDedupeContextDependencies {
  readonly configService: Readonly<IConfigService>;
  readonly directoryValidator: Readonly<IDirectoryValidator>;
}

interface IDedupeExecuteDependencies extends IDedupeContextDependencies {
  executeCore(
    directory: string,
    options: Readonly<IDedupeCommandOptions>,
    context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
  ): Promise<ICommandResult>;
}

interface IDedupeResolvedContext {
  readonly config: Readonly<OrderlyConfig>;
  readonly options: Readonly<IDedupeCommandInput>;
  readonly scanner: FileScanner;
  readonly targetDir: string;
}

/**
 * Handler for the standalone dedupe command.
 */
export class DedupeHandler implements IDedupeHandler {
  public readonly execute: (
    directory: string,
    options: Readonly<IDedupeCommandOptions>,
    context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
  ) => Promise<ICommandResult>;

  /**
   * Creates a new dedupe command handler.
   * @param configService - Config loading service.
   * @param directoryValidator - Directory validation service.
   * @param reportWriter - Dedupe report writer.
   * @param workflow - Optional dedupe workflow override.
   */
  constructor(
    readonly configService: Readonly<IConfigService>,
    readonly directoryValidator: Readonly<IDirectoryValidator>,
    reportWriter: Readonly<IDedupeReportService>,
    private readonly workflow: Readonly<DedupeWorkflow> = new DedupeWorkflow(reportWriter)
  ) {
    this.execute = createDedupeExecute({
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      executeCore: this.executeCore.bind(this)
    });
  }

  /**
   * Executes the dedupe command.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command result.
   */
  private async executeCore(
    directory: string,
    options: Readonly<IDedupeCommandOptions>,
    context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
  ): Promise<ICommandResult> {
    const commandContext = this.createCommandContext(directory, options, context);
    const replacementGuardResult = this.validateReplaceSafety(commandContext);
    if (replacementGuardResult) {
      return replacementGuardResult;
    }
    const workflowResult = await this.workflow.run(commandContext);
    return this.buildResult(workflowResult.result, workflowResult.deleteErrors.length);
  }

  /**
   * Creates dedupe execution context.
   * @param directory - Target directory.
   * @param options - Parsed command options.
   * @param context - Optional auto-config context.
   * @returns Command context.
   */
  private createCommandContext(
    directory: string,
    options: Readonly<IDedupeCommandOptions>,
    context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
  ): Readonly<IDedupeCommandContext & { readonly scanner: FileScanner }> {
    const commandOptions = normalizeDedupeCommandOptions(context?.configOptions ?? { ...options });
    const commandContext = createScannerCommandContext(createMappedCommandContextBase({
      directory,
      options: commandOptions,
      context: normalizeCommandContextOptions(context, normalizeDedupeCommandOptions),
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      toConfigOverrides: createDedupeConfigOverrides
    }));
    return this.buildCommandContext({
      config: commandContext.config,
      options: commandContext.configOptions,
      scanner: commandContext.scanner,
      targetDir: commandContext.targetDir
    });
  }

  /**
   * Builds the final command context object.
   * @param config - Loaded config.
   * @param options - Effective command options.
   * @param logger - Logger instance.
   * @param targetDir - Validated target directory.
   * @returns Command context.
   */
  private buildCommandContext(
    context: Readonly<IDedupeResolvedContext>
  ): Readonly<IDedupeCommandContext & { readonly scanner: FileScanner }> {
    return {
      dedupeConfig: resolveDedupeConfig(
        context.config.dedupe,
        context.options.action,
        context.options.preset
      ),
      options: context.options,
      scanner: context.scanner,
      targetDir: context.targetDir
    };
  }

  /**
   * Validates destructive replace safety requirements.
   * @param commandContext - Dedupe command context.
   * @returns Failure result when the action is unsafe; otherwise undefined.
   */
  private validateReplaceSafety(
    commandContext: Readonly<IDeleteSafetyContext>
  ): ICommandResult | undefined {
    return validateReplaceSafety(commandContext);
  }

  /**
   * Builds the final command result.
   * @param result - Dedupe result.
   * @param deleteErrorCount - Duplicate delete error count.
   * @returns CLI command result.
   */
  private buildResult(result: Readonly<IDedupeResult>, deleteErrorCount: number): ICommandResult {
    const success = deleteErrorCount === 0;
    return {
      success,
      exitCode: success ? ExitCode.SUCCESS : ExitCode.ERROR,
      message: COMMAND_MESSAGES.DEDUPE_SUCCESS.replace('{0}', String(result.totalFiles))
        .replace('{1}', String(result.groups.length))
        .replace('{2}', String(result.totalDuplicates))
    };
  }
}

/**
 * Creates normalized dedupe boolean options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized boolean options.
 */
function createDedupeBooleanOptions(value: object): Readonly<IDedupeCommandOptions> {
  const autoConfig = getOptionalBooleanOption(value, DedupeOptionKey.AUTO_CONFIG);
  const confirmReplace = getOptionalBooleanOption(value, DedupeOptionKey.CONFIRM_REPLACE);
  const dryRun = getOptionalBooleanOption(value, DedupeOptionKey.DRY_RUN);
  return {
    ...(autoConfig === undefined ? {} : { autoConfig }),
    ...(confirmReplace === undefined ? {} : { confirmReplace }),
    ...(dryRun === undefined ? {} : { dryRun })
  };
}

/**
 * Creates the wrapped execute function for the dedupe handler.
 * @param handler - Dedupe handler dependencies.
 * @returns Wrapped execute function.
 */
function createDedupeExecute(
  handler: Readonly<IDedupeExecuteDependencies>
): (
  directory: string,
  options: Readonly<IDedupeCommandOptions>,
  context?: Readonly<IAutoConfigContext<IDedupeCommandOptions>>
) => Promise<ICommandResult> {
  return createWrappedAutoConfigCommand<IDedupeCommandOptions>({
    commandName: 'dedupe',
    errorPrefix: COMMAND_MESSAGES.DEDUPE_FAILED,
    executeCore: handler.executeCore.bind(handler),
    normalizeDirectory: normalizeDedupeDirectory,
    normalizeOptions: normalizeDedupeOptions,
    service: handler
  });
}

/**
 * Creates normalized dedupe string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createDedupeStringOptions(value: object): Readonly<IDedupeCommandOptions> {
  const action = getOptionalStringOption(value, DedupeOptionKey.ACTION);
  const config = getOptionalStringOption(value, DedupeOptionKey.CONFIG);
  const logLevel = getOptionalStringOption(value, DedupeOptionKey.LOG_LEVEL);
  const preset = getOptionalStringOption(value, DedupeOptionKey.PRESET);
  const quarantineDir = getOptionalStringOption(value, DedupeOptionKey.QUARANTINE_DIR);
  const reportJson = getOptionalStringOption(value, DedupeOptionKey.REPORT_JSON);
  const reportMarkdown = getOptionalStringOption(value, DedupeOptionKey.REPORT_MARKDOWN);
  return {
    ...(action ? { action } : {}),
    ...(config ? { config } : {}),
    ...(logLevel ? { logLevel } : {}),
    ...(preset ? { preset } : {}),
    ...(quarantineDir ? { quarantineDir } : {}),
    ...(reportJson ? { reportJson } : {}),
    ...(reportMarkdown ? { reportMarkdown } : {})
  };
}

/**
 * Normalizes an unknown directory argument to a dedupe directory string.
 * @param value - Candidate directory value.
 * @returns Directory string.
 */
function normalizeDedupeDirectory(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Normalizes an unknown value to dedupe command options.
 * @param value - Candidate options value.
 * @returns Dedupe command options.
 */
function normalizeDedupeOptions(value: unknown): Readonly<IDedupeCommandOptions> {
  return normalizeObjectOptions<IDedupeCommandOptions>(
    value,
    createDedupeBooleanOptions,
    createDedupeStringOptions
  );
}
