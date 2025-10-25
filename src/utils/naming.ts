import * as path from 'node:path';
import { NamingConvention, NamingConventionType } from '../config/types';

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
    return str
      .toLowerCase()
      .replaceAll(/[-_\s]+(.)?/g, (_: string, char: string) => (char ? char.toUpperCase() : ''))
      .replaceAll(/^./g, (char: string) => char.toUpperCase());
  }

  static applyNamingConvention(filename: string, convention: NamingConvention): string {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    let convertedName: string;
    switch (convention.type) {
      case NamingConventionType.KEBAB_CASE:
        convertedName = this.toKebabCase(nameWithoutExt);
        break;
      case NamingConventionType.SNAKE_CASE:
        convertedName = this.toSnakeCase(nameWithoutExt);
        break;
      case NamingConventionType.CAMEL_CASE:
        convertedName = this.toCamelCase(nameWithoutExt);
        break;
      case NamingConventionType.PASCAL_CASE:
        convertedName = this.toPascalCase(nameWithoutExt);
        break;
      default:
        convertedName = nameWithoutExt;
    }

    if (
      convention.lowercase &&
      convention.type !== NamingConventionType.CAMEL_CASE &&
      convention.type !== NamingConventionType.PASCAL_CASE
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
