import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import { DEFAULT_CONFIG } from '../../config/types';
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
  execute(options: IInitOptions): Promise<ICommandResult> {
    try {
      const format = options.format || 'json';
      const configPath = this.getConfigPath(format);

      // Check if config already exists
      if (this.configExists(configPath)) {
        return Promise.resolve({
          success: false,
          exitCode: 1,
          message: `Configuration file already exists: ${configPath}`
        });
      }

      // Save default configuration
      ConfigLoader.save(DEFAULT_CONFIG, configPath);

      return Promise.resolve({
        success: true,
        exitCode: 0,
        message: `Created configuration file: ${configPath}`
      });
    } catch (error) {
      return Promise.resolve({
        success: false,
        exitCode: 1,
        message: `Init failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Gets the configuration file path based on format.
   * @param format - Configuration format (json or yaml)
   * @returns Configuration file path
   */
  private getConfigPath(format: string): string {
    const extension = format === 'yaml' ? 'yaml' : 'json';
    return path.resolve(`.orderly.config.${extension}`);
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
