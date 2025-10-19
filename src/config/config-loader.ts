import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { OrderlyConfig, DEFAULT_CONFIG } from './types';

export class ConfigLoader {
  private static CONFIG_FILES = ['.orderly.yml', '.orderly.yaml', 'orderly.config.json'];

  static load(configPath?: string): OrderlyConfig {
    let config = { ...DEFAULT_CONFIG };

    if (configPath) {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
      }
      config = this.mergeConfig(config, this.loadConfigFile(configPath));
    } else {
      const foundConfig = this.findConfig();
      if (foundConfig) {
        config = this.mergeConfig(config, this.loadConfigFile(foundConfig));
      }
    }

    return config;
  }

  private static findConfig(): string | null {
    const cwd = process.cwd();
    for (const configFile of this.CONFIG_FILES) {
      const fullPath = path.join(cwd, configFile);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  private static loadConfigFile(filePath: string): Partial<OrderlyConfig> {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yml' || ext === '.yaml') {
      return yaml.load(content) as Partial<OrderlyConfig>;
    }

    throw new Error(`Unsupported config file format: ${ext}`);
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
    let content: string;

    if (ext === '.json') {
      content = JSON.stringify(config, null, 2);
    } else if (ext === '.yml' || ext === '.yaml') {
      content = yaml.dump(config);
    } else {
      throw new Error(`Unsupported config file format: ${ext}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }
}
