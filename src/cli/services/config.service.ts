import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import type { OrderlyConfig } from '../../config/types';
import { DedupeAction, DedupeMode, IDedupeConfig } from '../../dedupe/types';
import { LogLevel } from '../../types/logging';
import type { IOrganizeOptions, IConfigService } from '../interfaces';

/**
 * Service for loading and managing configuration with command-line overrides.
 */
export class ConfigService implements IConfigService {
  /**
   * Loads configuration with command-line option overrides.
   * @param options - Command options that may override config
   * @returns Loaded and merged configuration
   */
  loadWithOverrides(options: IOrganizeOptions): OrderlyConfig {
    const configPath = options.config;
    const baseConfig = configPath ? ConfigLoader.load(configPath) : ConfigLoader.load();

    return this.applyOverrides(baseConfig, options);
  }

  /**
   * Applies command-line option overrides to the base configuration.
   * @param baseConfig - The base configuration to override
   * @param options - Command options to apply
   * @returns Configuration with overrides applied
   */
  private applyOverrides(baseConfig: OrderlyConfig, options: IOrganizeOptions): OrderlyConfig {
    const logLevel =
      options.logLevel && Object.values(LogLevel).includes(options.logLevel as LogLevel)
        ? (options.logLevel as LogLevel)
        : baseConfig.logLevel;

    const dedupeAction =
      options.dedupeAction &&
      Object.values(DedupeAction).includes(options.dedupeAction as DedupeAction)
        ? (options.dedupeAction as DedupeAction)
        : baseConfig.dedupe?.action;

    const result = {
      ...baseConfig,
      dryRun: options.dryRun ?? baseConfig.dryRun,
      logLevel,
      targetDirectory: options.output ? path.resolve(options.output) : baseConfig.targetDirectory
    };

    if (options.dedupe !== undefined || options.dedupeAction !== undefined) {
      result.dedupe = this.createDedupeConfig(baseConfig.dedupe, options.dedupe, dedupeAction);
    }

    return result;
  }

  /**
   * Creates a dedupe configuration by merging base config with overrides
   * @param baseDedupe - Base dedupe configuration from loaded config
   * @param enabled - Optional override for enabled flag
   * @param action - Optional override for dedupe action
   * @returns Merged dedupe configuration
   */
  private createDedupeConfig(
    baseDedupe: IDedupeConfig | undefined,
    enabled: boolean | undefined,
    action: DedupeAction | undefined
  ): IDedupeConfig {
    const defaultConfig = {
      enabled: true,
      recursive: false,
      strategy: { mode: DedupeMode.ANY },
      action: DedupeAction.SKIP
    };

    return {
      ...defaultConfig,
      ...baseDedupe,
      enabled: enabled ?? baseDedupe?.enabled ?? true,
      action: action ?? baseDedupe?.action ?? DedupeAction.SKIP
    };
  }
}
