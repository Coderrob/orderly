import * as path from 'node:path';

import { CONFIG_FILE_NAMES } from '../constants';
import { ConfigNotFoundError } from '../errors';
import { ConfigParser } from '../utils/config-parser';
import { FileSystemUtils } from '../utils/file-system-utils';

import { OrderlyConfig, DEFAULT_CONFIG, ConfigFormat } from './types';

export interface IConfigLoader {
  load(configPath?: string): OrderlyConfig;
  save(config: OrderlyConfig, filePath: string): void;
}

export class ConfigLoader implements IConfigLoader {
  private static readonly CONFIG_FILES = CONFIG_FILE_NAMES;

  /**
   *
   * @param configPath
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
   *
   * @param configPath
   */
  load(configPath?: string): OrderlyConfig {
    return ConfigLoader.load(configPath);
  }

  /**
   *
   * @param configPath
   * @param baseConfig
   */
  private static loadFromPath(configPath: string, baseConfig: OrderlyConfig): OrderlyConfig {
    if (!FileSystemUtils.existsSync(configPath)) {
      throw new ConfigNotFoundError(configPath);
    }
    const override = ConfigParser.parse(configPath);
    return this.mergeConfig(baseConfig, override);
  }

  /**
   *
   * @param baseConfig
   */
  private static loadFromDefault(baseConfig: OrderlyConfig): OrderlyConfig {
    const foundConfig = this.findConfig();
    if (!foundConfig) return baseConfig;

    const override = ConfigParser.parse(foundConfig);
    return this.mergeConfig(baseConfig, override);
  }

  /**
   *
   */
  private static findConfig(): string | null {
    const cwd = process.cwd();
    for (const configFile of this.CONFIG_FILES) {
      const fullPath = path.join(cwd, configFile);
      if (FileSystemUtils.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   *
   * @param base
   * @param override
   */
  private static mergeConfig(base: OrderlyConfig, override: Partial<OrderlyConfig>): OrderlyConfig {
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
   *
   * @param config
   * @param filePath
   */
  static save(config: OrderlyConfig, filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    const format = ext === '.json' ? ConfigFormat.JSON : ConfigFormat.YAML;
    const content = ConfigParser.stringify(config, format);
    FileSystemUtils.writeFileSync(filePath, content);
  }

  /**
   *
   * @param config
   * @param filePath
   */
  save(config: OrderlyConfig, filePath: string): void {
    ConfigLoader.save(config, filePath);
  }
}
