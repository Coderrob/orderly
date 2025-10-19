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
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
        return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
      })
      .replace(/[\s-_]+/g, '');
  }

  static toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
      .replace(/[\s-_]+/g, '');
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

    if (convention.lowercase && convention.type !== 'camelCase' && convention.type !== 'PascalCase') {
      convertedName = convertedName.toLowerCase();
    }

    return convertedName + ext.toLowerCase();
  }

  static needsRename(filename: string, convention: NamingConvention): boolean {
    const converted = this.applyNamingConvention(filename, convention);
    return filename !== converted;
  }
}
