import type { OrderlyConfig } from '../../config/types';
import { DedupeAction } from '../../dedupe';
import { Logger } from '../../logger/logger';
import { FileOrganizer } from '../../organizer/file-organizer';
import type { IOrganizationResult } from '../../organizer/types';
import { FileScanner } from '../../scanner/file-scanner';
import { ExitCode, COMMAND_MESSAGES } from '../constants';
import {
  IAutoConfigContext,
  WithAutoConfigDiscovery
} from '../decorators/auto-config-discovery.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
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

import { createCommandContextBase, logAutoDiscoveredConfig } from './command-context.helpers';

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

/**
 * Handler for the organize command.
 */
export class OrganizeHandler implements IOrganizeHandler {
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
  }

  private readonly workflow: Readonly<OrganizeWorkflow>;

  /**
   * Executes the organize command.
   * @param directory - Target directory to organize
   * @param options - Organize command options
   * @param context - Optional context injected by auto-config discovery.
   * @returns Promise resolving to command result
   */
  @WithCommandTelemetry('organize')
  @HandleCommandErrors(COMMAND_MESSAGES.ORGANIZATION_FAILED)
  @WithAutoConfigDiscovery<IOrganizeOptions>()
  async execute(
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
    const { config, logger, targetDir } = createCommandContextBase({
      directory,
      options,
      context,
      configService: this.configService,
      directoryValidator: this.directoryValidator
    });
    return {
      config,
      logger,
      organizer: new FileOrganizer(config, logger, targetDir),
      scanner: new FileScanner(config, logger),
      targetDir
    };
  }

  /**
   * Logs the discovered config path when auto-config resolution finds one.
   * @param logger - Logger instance.
   * @param autoDiscoveredConfig - Auto-discovered config path.
   */
  private logAutoDiscoveredConfig(logger: Readonly<Logger>, autoDiscoveredConfig?: string): void {
    logAutoDiscoveredConfig(logger, autoDiscoveredConfig);
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
