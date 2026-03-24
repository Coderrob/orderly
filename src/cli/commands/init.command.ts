import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import { DEFAULT_CONFIG } from '../../config/types';
import { ExitCode, ConfigFileFormat, CLI_CONSTANTS, COMMAND_MESSAGES } from '../constants';
import { WithCommandAudit } from '../decorators/command-audit.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type { IInitOptions, IInitHandler, ICommandResult } from '../interfaces';

/**
 * Handler for the init command.
 */
export class InitHandler implements IInitHandler {
  /**
   * Executes the init command.
   * @param options - Init command options
   * @returns Command result
   */
  @WithCommandAudit('init')
  @WithCommandTelemetry('init')
  @HandleCommandErrors(COMMAND_MESSAGES.INIT_FAILED)
  execute(options: Readonly<IInitOptions>): Promise<ICommandResult> {
    const format = options.format || CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT;
    const configPath = this.getConfigPath(format);
    return this.hasExistingConfig(configPath)
      ? Promise.resolve(this.buildFailureResult(configPath))
      : this.createConfig(configPath);
  }

  /**
   * Creates the config file and returns a success result.
   * @param configPath - Path where the config file will be written.
   * @returns Success result payload.
   */
  private createConfig(configPath: string): Promise<ICommandResult> {
    ConfigLoader.save(DEFAULT_CONFIG, configPath);
    return Promise.resolve({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: `${COMMAND_MESSAGES.CONFIG_CREATED}${configPath}`
    });
  }

  /**
   * Builds the failure result used when a config file already exists.
   * @param configPath - Existing config file path.
   * @returns Failure result payload.
   */
  private buildFailureResult(configPath: string): ICommandResult {
    return {
      success: false,
      exitCode: ExitCode.ERROR,
      message: `${COMMAND_MESSAGES.CONFIG_EXISTS}${configPath}`
    };
  }

  /**
   * Gets the configuration file path based on format.
   * @param format - Configuration format (json or yaml)
   * @returns Configuration file path
   */
  private getConfigPath(format: ConfigFileFormat | string): string {
    const formatLower = String(format).toLowerCase();
    const extension =
      formatLower === `${ConfigFileFormat.YAML}` || formatLower === `${ConfigFileFormat.YML}`
        ? ConfigFileFormat.YAML
        : ConfigFileFormat.JSON;
    return path.resolve(`${CLI_CONSTANTS.CONFIG_PREFIX}${extension}`);
  }

  /**
   * Checks if a configuration file already exists.
   * @param configPath - Path to check
   * @returns True if the file exists.
   */
  private hasExistingConfig(configPath: string): boolean {
    try {
      ConfigLoader.load(configPath);
      return true;
    } catch {
      return false;
    }
  }
}
