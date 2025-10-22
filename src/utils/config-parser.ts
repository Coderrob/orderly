import * as path from 'path';
import * as yaml from 'js-yaml';
import { OrderlyConfig } from '../config/types';
import { FileSystemUtils } from './file-system-utils';

export class ConfigParser {
  static parse(filePath: string): Partial<OrderlyConfig> {
    const ext = path.extname(filePath).toLowerCase();
    const content = FileSystemUtils.readFile(filePath);

    if (ext === '.json') {
      return JSON.parse(content);
    }

    if (ext === '.yml' || ext === '.yaml') {
      return yaml.load(content) as Partial<OrderlyConfig>;
    }

    throw new Error(`Unsupported config file format: ${ext}`);
  }

  static stringify(config: OrderlyConfig, format: 'json' | 'yaml'): string {
    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    }

    if (format === 'yaml') {
      return yaml.dump(config);
    }

    throw new Error(`Unsupported format: ${format}`);
  }
}
