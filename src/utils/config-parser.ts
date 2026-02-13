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
   * Parses a configuration file and returns the parsed configuration object
   * @param filePath - Path to the configuration file (must be .json, .yml, or .yaml)
   * @returns Partial configuration object parsed from the file
   * @throws UnsupportedConfigFormatError if file extension is not supported
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
   * Instance method that parses a configuration file
   * @param filePath - Path to the configuration file (must be .json, .yml, or .yaml)
   * @returns Partial configuration object parsed from the file
   */
  parse(filePath: string): Partial<OrderlyConfig> {
    return ConfigParser.parse(filePath);
  }

  /**
   * Serializes an OrderlyConfig object to a string in the specified format
   * @param config - The configuration object to serialize
   * @param format - The output format (JSON or YAML)
   * @returns Serialized configuration string in the requested format
   * @throws InvalidFormatError if format is not JSON or YAML
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
   * Instance method that serializes a configuration object to string
   * @param config - The configuration object to serialize
   * @param format - The output format (JSON or YAML)
   * @returns Serialized configuration string in the requested format
   */
  stringify(config: OrderlyConfig, format: ConfigFormat): string {
    return ConfigParser.stringify(config, format);
  }
}
