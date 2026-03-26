import type { OrderlyConfig } from '../../config/types';
import { Logger } from '../../logger/logger';
import { COMMAND_MESSAGES } from '../constants';
import type { IConfigService, IDirectoryValidator } from '../interfaces';

interface ICommandContextBaseOptions<TOptions> {
  readonly configService: Readonly<IConfigService>;
  readonly context:
    | Readonly<{
        readonly autoDiscoveredConfig?: string;
        readonly configOptions: TOptions;
        readonly targetDir: string;
      }>
    | undefined;
  readonly directory: string;
  readonly directoryValidator: Readonly<IDirectoryValidator>;
  readonly options: Readonly<TOptions>;
}

interface IMappedCommandContextBaseOptions<
  TOptions,
  TConfigOptions
> extends ICommandContextBaseOptions<TOptions> {
  readonly toConfigOverrides: (options: Readonly<TOptions>) => Readonly<TConfigOptions>;
}

interface ICommandContextBaseResult<TOptions> {
  readonly config: OrderlyConfig;
  readonly configOptions: Readonly<TOptions>;
  readonly logger: Logger;
  readonly targetDir: string;
}

/**
 * Builds the shared command context from resolved options and target directory.
 * @param params - Command context creation parameters.
 * @param loadConfig - Config-loading strategy for the resolved command options.
 * @returns Shared command context.
 */
function buildCommandContextBase<TOptions>(
  params: Readonly<ICommandContextBaseOptions<TOptions>>,
  loadConfig: (
    configService: Readonly<IConfigService>,
    configOptions: Readonly<TOptions>
  ) => OrderlyConfig
): Readonly<ICommandContextBaseResult<TOptions>> {
  const configOptions = params.context?.configOptions ?? { ...params.options };
  const targetDir =
    params.context?.targetDir ?? params.directoryValidator.validate(params.directory);
  const config = loadConfig(params.configService, configOptions);
  const logger = new Logger(config.logLevel);

  logAutoDiscoveredConfig(logger, params.context?.autoDiscoveredConfig);
  return { config, configOptions, logger, targetDir };
}

/**
 * Resolves the common config, logger, and target directory used by CLI commands.
 * @param params - Command context creation parameters.
 * @returns Shared command context.
 */
export function createCommandContextBase<TOptions>(
  params: Readonly<ICommandContextBaseOptions<TOptions>>
): Readonly<ICommandContextBaseResult<TOptions>> {
  return buildCommandContextBase(params, loadDirectCommandConfig);
}

/**
 * Resolves the common config, logger, and target directory for commands that map options before loading config.
 * @param params - Command context creation parameters.
 * @returns Shared command context.
 */
export function createMappedCommandContextBase<TOptions, TConfigOptions>(
  params: Readonly<IMappedCommandContextBaseOptions<TOptions, TConfigOptions>>
): Readonly<ICommandContextBaseResult<TOptions>> {
  return buildCommandContextBase(params, createMappedConfigLoader(params.toConfigOverrides));
}

/**
 * Creates a config loader that maps command options before loading config.
 * @param toConfigOverrides - Function that maps command options to config overrides.
 * @returns Config-loading strategy.
 */
function createMappedConfigLoader<TOptions, TConfigOptions>(
  toConfigOverrides: (options: Readonly<TOptions>) => Readonly<TConfigOptions>
): (configService: Readonly<IConfigService>, configOptions: Readonly<TOptions>) => OrderlyConfig {
  /**
   * Loads config after mapping command options to config overrides.
   * @param configService - Config loading service.
   * @param configOptions - Resolved command options.
   * @returns Loaded config.
   */
  function loadMappedCommandConfig(
    configService: Readonly<IConfigService>,
    configOptions: Readonly<TOptions>
  ): OrderlyConfig {
    return configService.loadWithOverrides(toConfigOverrides(configOptions));
  }

  return loadMappedCommandConfig;
}

/**
 * Loads config directly from the resolved command options.
 * @param configService - Config loading service.
 * @param configOptions - Resolved command options.
 * @returns Loaded config.
 */
function loadDirectCommandConfig<TOptions>(
  configService: Readonly<IConfigService>,
  configOptions: Readonly<TOptions>
): OrderlyConfig {
  return configService.loadWithOverrides(configOptions);
}

/**
 * Logs the discovered config path when auto-config resolution finds one.
 * @param logger - Logger instance.
 * @param autoDiscoveredConfig - Auto-discovered config path.
 */
export function logAutoDiscoveredConfig(
  logger: Readonly<Logger>,
  autoDiscoveredConfig?: string
): void {
  if (autoDiscoveredConfig) {
    logger.info(`${COMMAND_MESSAGES.CONFIG_AUTO_DISCOVERED}${autoDiscoveredConfig}`);
  }
}
