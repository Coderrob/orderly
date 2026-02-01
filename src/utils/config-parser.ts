import * as path from 'node:path';

import * as yaml from 'js-yaml';

import { OrderlyConfig, ConfigFormat } from '../config/types';
import { UnsupportedConfigFormatError, InvalidFormatError } from '../errors';

import { FileSystemUtils } from './file-system-utils';

/* istanbul ignore next */
export interface IConfigParser {
  parse(filePath: string): Partial<OrderlyConfig>;
  stringify(config: OrderlyConfig, format: ConfigFormat): string;
}

export class ConfigParser implements IConfigParser {
  /**
   *
   * @param filePath
   */
  static parse(filePath: string): Partial<OrderlyConfig> {
    const ext = path.extname(filePath).toLowerCase();
    const content = FileSystemUtils.readFileSync(filePath);

    if (ext === '.json') {
      return JSON.parse(content) as Partial<OrderlyConfig>;
    }

    if (ext === '.yml' || ext === '.yaml') {
      return yaml.load(content) as Partial<OrderlyConfig>;
    }

    throw new UnsupportedConfigFormatError(ext);
  }

  /**
   *
   * @param filePath
   */
  parse(filePath: string): Partial<OrderlyConfig> {
    return ConfigParser.parse(filePath);
  }

  /**
   *
   * @param config
   * @param format
   */
  static stringify(config: OrderlyConfig, format: ConfigFormat): string {
    if (format === ConfigFormat.JSON) {
      return JSON.stringify(config, null, 2);
    }

    if (format === ConfigFormat.YAML) {
      return yaml.dump(config);
    }

    throw new InvalidFormatError(String(format), 'json or yaml');
  }

  /**
   *
   * @param config
   * @param format
   */
  stringify(config: OrderlyConfig, format: ConfigFormat): string {
    return ConfigParser.stringify(config, format);
  }
}
