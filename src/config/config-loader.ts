import { ok as assert } from 'node:assert';
import * as path from 'node:path';

import { CONFIG_FILE_NAMES } from '../constants';
import { ConfigNotFoundError } from '../errors';
import {
  type ConfigParseResult,
  ConfigParser,
  type ConfigStringifyResult
} from '../utils/config-parser';
import { FileSystemUtils } from '../utils/file-system-utils';

import { OrderlyConfig, DEFAULT_CONFIG, ConfigFormat } from './types';

const JSON_EXTENSION = '.json';

export interface IConfigLoader {
  load(configPath?: string): OrderlyConfig;
  save(config: OrderlyConfig, filePath: string): void;
}

export class ConfigLoader implements IConfigLoader {
  private static readonly CONFIG_FILES = CONFIG_FILE_NAMES;

  /**
   * Loads configuration from a specified path or from default locations
   * @param configPath - Optional path to a configuration file. If not provided, searches for default config files
   * @returns Loaded configuration merged with default configuration
   */
  static load(configPath?: string): OrderlyConfig {
    let config = { ...DEFAULT_CONFIG };

    if (configPath) {
      config = this.loadFromPath(configPath, config);
    } else {
      config = this.loadFromDefault(config);
    }

    return config;
  }

  /**
   * Instance method that loads configuration by delegating to the static load method
   * @param configPath - Optional path to a configuration file
   * @returns Loaded configuration merged with default configuration
   */
  load(configPath?: string): OrderlyConfig {
    return ConfigLoader.load(configPath);
  }

  /**
   * Loads configuration from a specific file path and merges with base configuration
   * @param configPath - Path to the configuration file to load
   * @param baseConfig - Base configuration to merge with the loaded configuration
   * @returns Merged configuration with loaded values overriding base configuration
   * @throws {ConfigNotFoundError} Thrown when the requested config path does not exist.
   */
  private static loadFromPath(
    configPath: string,
    baseConfig: Readonly<OrderlyConfig>
  ): OrderlyConfig {
    assert(FileSystemUtils.hasPath(configPath), new ConfigNotFoundError(configPath));
    const overrideResult = ConfigParser.parse(configPath);
    assertConfigParseSucceeded(overrideResult);
    return this.mergeConfig(baseConfig, overrideResult.value);
  }

  /**
   * Loads configuration from default locations in the current working directory
   * @param baseConfig - Base configuration to merge with the found configuration
   * @returns Merged configuration if a default config file is found, otherwise the base configuration
   */
  private static loadFromDefault(baseConfig: Readonly<OrderlyConfig>): OrderlyConfig {
    const foundConfig = this.findConfig();
    if (!foundConfig) return baseConfig;

    const overrideResult = ConfigParser.parse(foundConfig);
    assertConfigParseSucceeded(overrideResult);
    return this.mergeConfig(baseConfig, overrideResult.value);
  }

  /**
   * Searches for a configuration file in the current working directory
   * @returns Path to the first found configuration file, or null if none found
   */
  private static findConfig(): string | null {
    const cwd = process.cwd();
    for (const configFile of this.CONFIG_FILES) {
      const fullPath = path.join(cwd, configFile);
      if (FileSystemUtils.hasPath(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Merges base configuration with override configuration, preserving nested structures
   * @param base - Base configuration to start with
   * @param override - Override configuration with values to merge in
   * @returns Merged configuration with override values taking precedence for nested objects
   */
  private static mergeConfig(
    base: Readonly<OrderlyConfig>,
    override: Readonly<Partial<OrderlyConfig>>
  ): OrderlyConfig {
    return {
      ...base,
      ...override,
      categories: override.categories || base.categories,
      namingConvention: override.namingConvention
        ? { ...base.namingConvention, ...override.namingConvention }
        : base.namingConvention,
      excludePatterns: override.excludePatterns || base.excludePatterns
    };
  }

  /**
   * Saves configuration to a file in JSON or YAML format based on file extension
   * @param config - Configuration object to save
   * @param filePath - Path where the configuration file will be saved
   */
  static save(config: Readonly<OrderlyConfig>, filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    const format = ext === JSON_EXTENSION ? ConfigFormat.JSON : ConfigFormat.YAML;
    const contentResult = ConfigParser.stringify(config, format);
    assertConfigStringifySucceeded(contentResult);
    FileSystemUtils.writeFileSync(filePath, contentResult.value);
  }

  /**
   * Instance method that saves configuration by delegating to the static save method
   * @param config - Configuration object to save
   * @param filePath - Path where the configuration file will be saved
   */
  save(config: Readonly<OrderlyConfig>, filePath: string): void {
    ConfigLoader.save(config, filePath);
  }
}

/**
 * Narrows a parse result to the successful variant or raises the underlying error.
 * @param parseResult - Parse result to validate.
 */
function assertConfigParseSucceeded(
  parseResult: Readonly<ConfigParseResult>
): asserts parseResult is Extract<ConfigParseResult, { success: true }> {
  assert(parseResult.success, parseResult.success ? undefined : parseResult.error);
}

/**
 * Narrows a stringify result to the successful variant or raises the underlying error.
 * @param stringifyResult - Stringify result to validate.
 */
function assertConfigStringifySucceeded(
  stringifyResult: Readonly<ConfigStringifyResult>
): asserts stringifyResult is Extract<ConfigStringifyResult, { success: true }> {
  assert(stringifyResult.success, stringifyResult.success ? undefined : stringifyResult.error);
}
