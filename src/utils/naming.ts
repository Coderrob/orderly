import * as path from 'node:path';
import { NamingConvention } from '../config/types';

export class NamingUtils {
  static toKebabCase(str: string): string {
    return str
      .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
      .replaceAll(/[\s_]+/g, '-')
      .replaceAll(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();
  }

  static toSnakeCase(str: string): string {
    return str
      .replaceAll(/([a-z])([A-Z])/g, '$1_$2')
      .replaceAll(/[\s-]+/g, '_')
      .replaceAll(/\W/g, '')
      .toLowerCase();
  }

  static toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replaceAll(/[-_\s]+(.)?/g, (_: string, char: string) => (char ? char.toUpperCase() : ''));
  }

  static toPascalCase(str: string): string {
    // Note: replaceAll() doesn't support callback functions with regex, so we use replace() with 'g' flag
    return str
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_: string, char: string) => (char ? char.toUpperCase() : ''))
      .replace(/^./, (char: string) => char.toUpperCase());
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
