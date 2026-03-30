import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import type { OrderlyConfig } from '../../config/types';
import { COMMAND_MESSAGES, ExitCode } from '../constants';
import type {
  IConfigService,
  IConfigValidateHandler,
  IConfigValidateOptions,
  ICommandResult
} from '../interfaces';

import { getOptionalStringOption, normalizeObjectOptions } from './command-option.helpers';
import {
  createSingleOptionsCommandExecutionRef,
  createWrappedSingleOptionsCommand
} from './command-wrapper.helpers';

/**
 * Handler for config validation.
 */
export class ConfigValidateHandler implements IConfigValidateHandler {
  public readonly execute: (options: Readonly<IConfigValidateOptions>) => Promise<ICommandResult>;

  /**
   * Creates a new config validation command handler.
   * @param configService - Config service used for discovery.
   */
  constructor(private readonly configService: Readonly<IConfigService>) {
    this.execute = createWrappedSingleOptionsCommand({
      commandName: 'config-validate',
      errorPrefix: COMMAND_MESSAGES.CONFIG_INVALID,
      executeCoreRef: createSingleOptionsCommandExecutionRef({
        executeCore: this.executeCore.bind(this),
        normalizeOptions: normalizeConfigValidateOptions
      })
    });
  }

  /**
   * Validates a config file.
   * @param options - Validation options.
   * @returns Command result.
   */
  private executeCore(options: Readonly<IConfigValidateOptions>): Promise<ICommandResult> {
    const configPath = this.resolveConfigPath(options);
    if (!configPath) {
      return Promise.resolve({
        success: false,
        exitCode: ExitCode.ERROR,
        message: `${COMMAND_MESSAGES.CONFIG_INVALID}No config file found`
      });
    }

    const config = ConfigLoader.load(configPath);
    return Promise.resolve({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: this.createSuccessMessage(path.resolve(configPath), config)
    });
  }

  /**
   * Resolves the config path to validate.
   * @param options - Validation options.
   * @returns Resolved config path or null when none is available.
   */
  private resolveConfigPath(options: Readonly<IConfigValidateOptions>): string | null {
    if (options.config) {
      return options.config;
    }

    const directory = options.directory ? path.resolve(options.directory) : process.cwd();
    return this.configService.findConfigInDirectory(directory);
  }

  /**
   * Creates the config validation success message.
   * @param configPath - Resolved config path.
   * @param config - Loaded config.
   * @returns Success message.
   */
  private createSuccessMessage(configPath: string, config: Readonly<OrderlyConfig>): string {
    return COMMAND_MESSAGES.CONFIG_VALID.replace('{0}', configPath).replace(
      '{1}',
      String(config.categories.length)
    );
  }
}

enum ConfigValidateOptionKey {
  CONFIG = 'config',
  DIRECTORY = 'directory'
}

/**
 * Creates normalized config-validation string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createConfigValidateStringOptions(value: object): Readonly<IConfigValidateOptions> {
  const config = getOptionalStringOption(value, ConfigValidateOptionKey.CONFIG);
  const directory = getOptionalStringOption(value, ConfigValidateOptionKey.DIRECTORY);
  return {
    ...(config ? { config } : {}),
    ...(directory ? { directory } : {})
  };
}

/**
 * Normalizes an unknown command argument to config validation options.
 * @param value - Candidate options value.
 * @returns Normalized config validation options.
 */
function normalizeConfigValidateOptions(value: unknown): Readonly<IConfigValidateOptions> {
  return normalizeObjectOptions<IConfigValidateOptions>(value, createConfigValidateStringOptions);
}
