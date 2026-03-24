import * as fs from 'node:fs';
import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import type { OrderlyConfig } from '../../config/types';
import { CONFIG_FILE_NAMES } from '../../constants';
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
  loadWithOverrides(options: Readonly<IOrganizeOptions>): OrderlyConfig {
    const configPath = options.config;
    const baseConfig = configPath ? ConfigLoader.load(configPath) : ConfigLoader.load();

    return this.applyOverrides(baseConfig, options);
  }

  /**
   * Searches for a config file in the target directory.
   * @param directory - Directory to search in
   * @returns Path to config file if found, null otherwise
   */
  findConfigInDirectory(directory: string): string | null {
    for (const configName of CONFIG_FILE_NAMES) {
      const configPath = path.join(directory, configName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  /**
   * Applies command-line option overrides to the base configuration.
   * @param baseConfig - The base configuration to override
   * @param options - Command options to apply
   * @returns Configuration with overrides applied
   */
  private applyOverrides(
    baseConfig: Readonly<OrderlyConfig>,
    options: Readonly<IOrganizeOptions>
  ): OrderlyConfig {
    const result = {
      ...baseConfig,
      dryRun: options.dryRun ?? baseConfig.dryRun,
      logLevel: this.resolveLogLevel(options.logLevel) ?? baseConfig.logLevel,
      targetDirectory: options.output ? path.resolve(options.output) : baseConfig.targetDirectory
    };
    return this.withOptionalDedupeOverride(result, baseConfig, options);
  }

  /**
   * Applies dedupe overrides only when dedupe-related options were provided.
   * @param baseResult - Config result before dedupe overrides.
   * @param baseConfig - Base config loaded from file/defaults.
   * @param options - Parsed organize options.
   * @returns Config with optional dedupe override.
   */
  private withOptionalDedupeOverride(
    baseResult: Readonly<OrderlyConfig>,
    baseConfig: Readonly<OrderlyConfig>,
    options: Readonly<IOrganizeOptions>
  ): OrderlyConfig {
    if (options.dedupe === undefined && options.dedupeAction === undefined) {
      return { ...baseResult };
    }

    return {
      ...baseResult,
      dedupe: this.createDedupeConfig(
        baseConfig.dedupe,
        options.dedupe,
        this.resolveDedupeAction(options.dedupeAction) ?? baseConfig.dedupe?.action
      )
    };
  }

  /**
   * Resolves a raw CLI log level to a supported enum value.
   * @param logLevel - Raw CLI log level value.
   * @returns Supported log level when valid.
   */
  private resolveLogLevel(logLevel?: string): LogLevel | undefined {
    switch (logLevel) {
      case LogLevel.DEBUG:
        return LogLevel.DEBUG;
      case LogLevel.INFO:
        return LogLevel.INFO;
      case LogLevel.WARN:
        return LogLevel.WARN;
      case LogLevel.ERROR:
        return LogLevel.ERROR;
      default:
        return undefined;
    }
  }

  /**
   * Resolves a raw CLI dedupe action to a supported enum value.
   * @param dedupeAction - Raw CLI dedupe action value.
   * @returns Supported dedupe action when valid.
   */
  private resolveDedupeAction(dedupeAction?: string): DedupeAction | undefined {
    switch (dedupeAction) {
      case DedupeAction.SKIP:
        return DedupeAction.SKIP;
      case DedupeAction.REPORT:
        return DedupeAction.REPORT;
      case DedupeAction.REPLACE:
        return DedupeAction.REPLACE;
      default:
        return undefined;
    }
  }

  /**
   * Creates a dedupe configuration by merging base config with overrides
   * @param baseDedupe - Base dedupe configuration from loaded config
   * @param enabled - Optional override for enabled flag
   * @param action - Optional override for dedupe action
   * @returns Merged dedupe configuration
   */
  private createDedupeConfig(
    baseDedupe: Readonly<IDedupeConfig> | undefined,
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
