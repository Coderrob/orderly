import * as path from 'node:path';

import { NamingConvention, NamingConventionType } from '../config/types';

export interface INamingUtils {
  toKebabCase(str: string): string;
  toSnakeCase(str: string): string;
  toCamelCase(str: string): string;
  toPascalCase(str: string): string;
  applyNamingConvention(filename: string, convention: NamingConvention): string;
  needsRename(filename: string, convention: NamingConvention): boolean;
}

export class NamingUtils implements INamingUtils {
  /**
   * Converts a string to kebab-case format.
   * @param str - The input string to convert
   * @returns The string converted to kebab-case
   */
  static toKebabCase(str: string): string {
    return str
      .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
      .replaceAll(/[\s_]+/g, '-')
      .replaceAll(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();
  }

  /**
   * Converts a string to kebab-case format.
   * @param str - The input string to convert
   * @returns The string converted to kebab-case
   */
  toKebabCase(str: string): string {
    return NamingUtils.toKebabCase(str);
  }

  /**
   * Converts a string to snake_case format.
   * @param str - The input string to convert
   * @returns The string converted to snake_case
   */
  static toSnakeCase(str: string): string {
    return str
      .replaceAll(/([a-z])([A-Z])/g, '$1_$2')
      .replaceAll(/[\s-]+/g, '_')
      .replaceAll(/\W/g, '')
      .toLowerCase();
  }

  /**
   * Converts a string to snake_case format.
   * @param str - The input string to convert
   * @returns The string converted to snake_case
   */
  toSnakeCase(str: string): string {
    return NamingUtils.toSnakeCase(str);
  }

  /**
   * Converts a string to camelCase format.
   * @param str - The input string to convert
   * @returns The string converted to camelCase
   */
  static toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replaceAll(/[-_\s]+(.)?/g, (_: string, char: string) => (char ? char.toUpperCase() : ''));
  }

  /**
   * Converts a string to camelCase format.
   * @param str - The input string to convert
   * @returns The string converted to camelCase
   */
  toCamelCase(str: string): string {
    return NamingUtils.toCamelCase(str);
  }

  /**
   * Converts a string to PascalCase format.
   * @param str - The input string to convert
   * @returns The string converted to PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .toLowerCase()
      .replaceAll(/[-_\s]+(.)?/g, (_: string, char: string) => (char ? char.toUpperCase() : ''))
      .replaceAll(/^./g, (char: string) => char.toUpperCase());
  }

  /**
   * Converts a string to PascalCase format.
   * @param str - The input string to convert
   * @returns The string converted to PascalCase
   */
  toPascalCase(str: string): string {
    return NamingUtils.toPascalCase(str);
  }

  /**
   * Applies a naming convention to a filename.
   * @param filename - The filename to apply the convention to
   * @param convention - The naming convention to apply
   * @returns The filename with the naming convention applied
   */
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

  /**
   * Applies a naming convention to a filename.
   * @param filename - The filename to apply the convention to
   * @param convention - The naming convention to apply
   * @returns The filename with the naming convention applied
   */
  applyNamingConvention(filename: string, convention: NamingConvention): string {
    return NamingUtils.applyNamingConvention(filename, convention);
  }

  /**
   * Determines if a filename needs to be renamed according to the given convention.
   * @param filename - The filename to check
   * @param convention - The naming convention to check against
   * @returns True if the filename needs to be renamed, false otherwise
   */
  static needsRename(filename: string, convention: NamingConvention): boolean {
    const converted = this.applyNamingConvention(filename, convention);
    return filename !== converted;
  }

  /**
   * Determines if a filename needs to be renamed according to the given convention.
   * @param filename - The filename to check
   * @param convention - The naming convention to check against
   * @returns True if the filename needs to be renamed, false otherwise
   */
  needsRename(filename: string, convention: NamingConvention): boolean {
    return NamingUtils.needsRename(filename, convention);
  }
}
