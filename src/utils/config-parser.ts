import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { OrderlyConfig, ConfigFormat } from '../config/types';
import { FileSystemUtils } from './file-system-utils';

export class ConfigParser {
  static parse(filePath: string): Partial<OrderlyConfig> {
    const ext = path.extname(filePath).toLowerCase();
    const content = FileSystemUtils.readFile(filePath);

    if (ext === '.json') {
      return JSON.parse(content) as Partial<OrderlyConfig>;
    }

    if (ext === '.yml' || ext === '.yaml') {
      return yaml.load(content) as Partial<OrderlyConfig>;
    }

    throw new Error(`Unsupported config file format: ${ext}`);
  }

  static stringify(config: OrderlyConfig, format: ConfigFormat): string {
    if (format === ConfigFormat.JSON) {
      return JSON.stringify(config, null, 2);
    }

    if (format === ConfigFormat.YAML) {
      return yaml.dump(config);
    }

    throw new Error(`Unsupported format: ${String(format)}`);
  }
}
