import * as path from 'path';
import { NamingConvention } from '../config/types';

export class NamingUtils {
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();
  }

  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  static toCamelCase(str: string): string {
    return str.toLowerCase().replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
  }

  static toPascalCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^./, char => char.toUpperCase());
  }

  static applyNamingConvention(filename: string, convention: NamingConvention): string {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    let convertedName: string;
    switch (convention.type) {
      case 'kebab-case':
        convertedName = this.toKebabCase(nameWithoutExt);
        break;
      case 'snake_case':
        convertedName = this.toSnakeCase(nameWithoutExt);
        break;
      case 'camelCase':
        convertedName = this.toCamelCase(nameWithoutExt);
        break;
      case 'PascalCase':
        convertedName = this.toPascalCase(nameWithoutExt);
        break;
      default:
        convertedName = nameWithoutExt;
    }

    if (
      convention.lowercase &&
      convention.type !== 'camelCase' &&
      convention.type !== 'PascalCase'
    ) {
      convertedName = convertedName.toLowerCase();
    }

    return convertedName + ext.toLowerCase();
  }

  static needsRename(filename: string, convention: NamingConvention): boolean {
    const converted = this.applyNamingConvention(filename, convention);
    return filename !== converted;
  }
}
