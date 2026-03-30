import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
import { IAutoConfigContext } from '../decorators/auto-config-discovery.decorator';
import type {
  ICleanerService,
  IOrganizeOptions,
  IOrganizeHandler,
  ICommandResult,
  IConfigService,
  IDirectoryValidator,
  IManifestService
} from '../interfaces';
import { OrganizeWorkflow } from '../services';

import { createCommandContextBase, createScannerCommandContext } from './command-context.helpers';
import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';
import { createWrappedAutoConfigCommand } from './command-wrapper.helpers';

interface IOrganizeCommandContext {
  readonly config: OrderlyConfig;
  readonly logger: Logger;
  readonly organizer: FileOrganizer;
  readonly scanner: FileScanner;
  readonly targetDir: string;
}

interface IOrganizeHandlerDependencies {
  readonly cleaner?: Readonly<ICleanerService>;
  readonly manifestService: Readonly<IManifestService>;
  readonly workflow?: Readonly<OrganizeWorkflow>;
}

interface IOrganizeContextDependencies {
  readonly configService: Readonly<IConfigService>;
  readonly directoryValidator: Readonly<IDirectoryValidator>;
}

interface IOrganizeExecuteDependencies extends IOrganizeContextDependencies {
  executeCore(
    directory: string,
    options: Readonly<IOrganizeOptions>,
    context?: Readonly<IAutoConfigContext<IOrganizeOptions>>
  ): Promise<ICommandResult>;
}

enum OrganizeOptionKey {
  AUTO_CONFIG = 'autoConfig',
  CLEAN_EMPTY_DIRS = 'cleanEmptyDirs',
  CONFIG = 'config',
  CONFIRM_REPLACE = 'confirmReplace',
  DEDUPE = 'dedupe',
  DEDUPE_ACTION = 'dedupeAction',
  DRY_RUN = 'dryRun',
  LOG_LEVEL = 'logLevel',
  MANIFEST = 'manifest',
  OUTPUT = 'output',
  QUARANTINE_DIR = 'quarantineDir'
}

/**
 * Handler for the organize command.
 */
export class OrganizeHandler implements IOrganizeHandler {
  public readonly execute: (
    directory: string,
    options: Readonly<IOrganizeOptions>,
    context?: Readonly<IAutoConfigContext<IOrganizeOptions>>
  ) => Promise<ICommandResult>;

  /**
   * Creates a new OrganizeHandler instance
   * @param configService - Service for loading and managing configuration
   * @param directoryValidator - Service for validating directory paths
   * @param dependencies - Organize workflow dependencies.
   */
  constructor(
    private readonly configService: Readonly<IConfigService>,
    private readonly directoryValidator: Readonly<IDirectoryValidator>,
    dependencies: Readonly<IOrganizeHandlerDependencies>
  ) {
    this.workflow =
      dependencies.workflow ??
      new OrganizeWorkflow(dependencies.manifestService, dependencies.cleaner);
    this.execute = createOrganizeExecute({
      configService: this.configService,
      directoryValidator: this.directoryValidator,
      executeCore: this.executeCore.bind(this)
    });
  }

  private readonly workflow: Readonly<OrganizeWorkflow>;

  /**
   * Executes the organize command.
   * @param directory - Target directory to organize
   * @param options - Organize command options
   * @param context - Optional context injected by auto-config discovery.
   * @returns Promise resolving to command result
   */
  private async executeCore(
    directory: string,
    options: Readonly<IOrganizeOptions>,
    context?: Readonly<IAutoConfigContext<IOrganizeOptions>>
  ): Promise<ICommandResult> {
    const commandContext = this.createCommandContext(directory, options, context);
    const dedupeSafetyResult = this.validateReplaceSafety(commandContext.config, options);
    if (dedupeSafetyResult) {
      return dedupeSafetyResult;
    }
    const result = await this.workflow.run(commandContext, options);
    return this.buildSuccessResult(result);
  }

  /**
   * Creates the shared command context used by organize execution.
   * @param directory - Target directory to organize.
   * @param options - Organize command options.
   * @param context - Optional auto-config discovery context.
   * @returns Shared command context.
   */
  private createCommandContext(
    directory: string,
    options: Readonly<IOrganizeOptions>,
    context?: Readonly<IAutoConfigContext<IOrganizeOptions>>
  ): Readonly<IOrganizeCommandContext> {
    return this.buildOrganizeCommandContext(
      createScannerCommandContext(
        createCommandContextBase({
          directory,
          options,
          context,
          configService: this.configService,
          directoryValidator: this.directoryValidator
        })
      )
    );
  }

  /**
   * Builds the final organize command context from the shared base context.
   * @param commandContext - Shared scanner command context.
   * @returns Organize command context.
   */
  private buildOrganizeCommandContext(
    commandContext: Readonly<{
      config: OrderlyConfig;
      logger: Logger;
      scanner: FileScanner;
      targetDir: string;
    }>
  ): Readonly<IOrganizeCommandContext> {
    return {
      config: commandContext.config,
      logger: commandContext.logger,
      organizer: new FileOrganizer(
        commandContext.config,
        commandContext.logger,
        commandContext.targetDir
      ),
      scanner: commandContext.scanner,
      targetDir: commandContext.targetDir
    };
  }

  /**
   * Builds the success result returned by the handler.
   * @param result - Organization result.
   * @returns Command success payload.
   */
  private buildSuccessResult(result: Readonly<IOrganizationResult>): ICommandResult {
    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.ORGANIZED_SUCCESS.replace('{0}', String(result.operations.length))
    };
  }

  /**
   * Validates destructive dedupe replacement safety requirements.
   * @param config - Loaded config.
   * @param options - Parsed organize options.
   * @returns Failure result when replace is unsafe; otherwise undefined.
   */
  private validateReplaceSafety(
    config: Readonly<OrderlyConfig>,
    options: Readonly<IOrganizeOptions>
  ): ICommandResult | undefined {
    const requiresConfirmation =
      config.dedupe?.enabled &&
      config.dedupe.action === DedupeAction.REPLACE &&
      !config.dryRun &&
      !options.confirmReplace &&
      !options.quarantineDir;

    return requiresConfirmation
      ? {
          success: false,
          exitCode: ExitCode.ERROR,
          message:
            'Organize dedupe replace requires --confirm-replace or --quarantine-dir when not running in dry-run mode'
        }
      : undefined;
  }
}

/**
 * Creates normalized organize boolean options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized boolean options.
 */
function createOrganizeBooleanOptions(value: object): Readonly<IOrganizeOptions> {
  const autoConfig = getOptionalBooleanOption(value, OrganizeOptionKey.AUTO_CONFIG);
  const cleanEmptyDirs = getOptionalBooleanOption(value, OrganizeOptionKey.CLEAN_EMPTY_DIRS);
  const confirmReplace = getOptionalBooleanOption(value, OrganizeOptionKey.CONFIRM_REPLACE);
  const dedupe = getOptionalBooleanOption(value, OrganizeOptionKey.DEDUPE);
  const dryRun = getOptionalBooleanOption(value, OrganizeOptionKey.DRY_RUN);
  const manifest = getOptionalBooleanOption(value, OrganizeOptionKey.MANIFEST);
  return {
    ...(autoConfig === undefined ? {} : { autoConfig }),
    ...(cleanEmptyDirs === undefined ? {} : { cleanEmptyDirs }),
    ...(confirmReplace === undefined ? {} : { confirmReplace }),
    ...(dedupe === undefined ? {} : { dedupe }),
    ...(dryRun === undefined ? {} : { dryRun }),
    ...(manifest === undefined ? {} : { manifest })
  };
}

/**
 * Creates the wrapped execute function for the organize handler.
 * @param handler - Organize handler dependencies.
 * @returns Wrapped execute function.
 */
function createOrganizeExecute(
  handler: Readonly<IOrganizeExecuteDependencies>
): (
  directory: string,
  options: Readonly<IOrganizeOptions>,
  context?: Readonly<IAutoConfigContext<IOrganizeOptions>>
) => Promise<ICommandResult> {
  return createWrappedAutoConfigCommand<IOrganizeOptions>({
    commandName: 'organize',
    errorPrefix: COMMAND_MESSAGES.ORGANIZATION_FAILED,
    executeCore: handler.executeCore.bind(handler),
    normalizeDirectory: normalizeOrganizeDirectory,
    normalizeOptions: normalizeOrganizeOptions,
    service: handler
  });
}

/**
 * Creates normalized organize string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createOrganizeStringOptions(value: object): Readonly<IOrganizeOptions> {
  const config = getOptionalStringOption(value, OrganizeOptionKey.CONFIG);
  const dedupeAction = getOptionalStringOption(value, OrganizeOptionKey.DEDUPE_ACTION);
  const logLevel = getOptionalStringOption(value, OrganizeOptionKey.LOG_LEVEL);
  const output = getOptionalStringOption(value, OrganizeOptionKey.OUTPUT);
  const quarantineDir = getOptionalStringOption(value, OrganizeOptionKey.QUARANTINE_DIR);
  return {
    ...(config ? { config } : {}),
    ...(dedupeAction ? { dedupeAction } : {}),
    ...(logLevel ? { logLevel } : {}),
    ...(output ? { output } : {}),
    ...(quarantineDir ? { quarantineDir } : {})
  };
}

/**
 * Normalizes an unknown directory argument to an organize directory string.
 * @param value - Candidate directory value.
 * @returns Directory string.
 */
function normalizeOrganizeDirectory(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Normalizes an unknown value to organize command options.
 * @param value - Candidate options value.
 * @returns Organize command options.
 */
function normalizeOrganizeOptions(value: unknown): Readonly<IOrganizeOptions> {
  return normalizeObjectOptions<IOrganizeOptions>(
    value,
    createOrganizeBooleanOptions,
    createOrganizeStringOptions
  );
}
