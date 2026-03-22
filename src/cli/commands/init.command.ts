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
  execute(options: IInitOptions): Promise<ICommandResult> {
    const format = options.format || CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT;
    const configPath = this.getConfigPath(format);

    // Check if config already exists
    if (this.configExists(configPath)) {
      return Promise.resolve({
        success: false,
        exitCode: ExitCode.ERROR,
        message: `${COMMAND_MESSAGES.CONFIG_EXISTS}${configPath}`
      });
    }

    // Save default configuration
    ConfigLoader.save(DEFAULT_CONFIG, configPath);

    return Promise.resolve({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: `${COMMAND_MESSAGES.CONFIG_CREATED}${configPath}`
    });
  }

  /**
   * Gets the configuration file path based on format.
   * @param format - Configuration format (json or yaml)
   * @returns Configuration file path
   */
  private getConfigPath(format: ConfigFileFormat | string): string {
    const formatLower = typeof format === 'string' ? format.toLowerCase() : format;
    const extension = formatLower === 'yaml' || formatLower === 'yml' ? 'yaml' : 'json';
    return path.resolve(`${CLI_CONSTANTS.CONFIG_PREFIX}${extension}`);
  }

  /**
   * Checks if a configuration file already exists.
   * @param configPath - Path to check
   * @returns True if the file exists
   */
  private configExists(configPath: string): boolean {
    try {
      ConfigLoader.load(configPath);
      return true;
    } catch {
      return false;
    }
  }
}
