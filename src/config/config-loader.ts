import * as path from 'path';
import { OrderlyConfig, DEFAULT_CONFIG } from './types';
import { FileSystemUtils } from '../utils/file-system-utils';
import { ConfigParser } from '../utils/config-parser';

export class ConfigLoader {
  private static CONFIG_FILES = ['.orderly.yml', '.orderly.yaml', 'orderly.config.json'];

  static load(configPath?: string): OrderlyConfig {
    let config = { ...DEFAULT_CONFIG };

    if (configPath) {
      config = this.loadFromPath(configPath, config);
    } else {
      config = this.loadFromDefault(config);
    }

    return config;
  }

  private static loadFromPath(configPath: string, baseConfig: OrderlyConfig): OrderlyConfig {
    if (!FileSystemUtils.exists(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    const override = ConfigParser.parse(configPath);
    return this.mergeConfig(baseConfig, override);
  }

  private static loadFromDefault(baseConfig: OrderlyConfig): OrderlyConfig {
    const foundConfig = this.findConfig();
    if (foundConfig) {
      const override = ConfigParser.parse(foundConfig);
      return this.mergeConfig(baseConfig, override);
    }
    return baseConfig;
  }

  private static findConfig(): string | null {
    const cwd = process.cwd();
    for (const configFile of this.CONFIG_FILES) {
      const fullPath = path.join(cwd, configFile);
      if (FileSystemUtils.exists(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

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

  static save(config: OrderlyConfig, filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    const format = ext === '.json' ? 'json' : 'yaml';
    const content = ConfigParser.stringify(config, format as 'json' | 'yaml');
    FileSystemUtils.writeFile(filePath, content);
  }
}
