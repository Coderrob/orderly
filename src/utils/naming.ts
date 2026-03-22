import * as path from 'node:path';

import { NamingConvention, NamingConventionType } from '../config/types';

import type { INamingUtils } from './interfaces';

/**
 * Capitalizes a delimiter-separated character group when present.
 * @param _match - The full regex match.
 * @param char - The captured character following the delimiter.
 * @returns The capitalized character or an empty string when absent.
 */
function capitalizeDelimitedGroup(_match: string, char: string): string {
  return char ? char.toUpperCase() : '';
}

/**
 * Capitalizes the first character in a string.
 * @param char - The matched character.
 * @returns The uppercased character.
 */
function capitalizeFirstCharacter(char: string): string {
  return char.toUpperCase();
}

/**
 * Converts a filename stem according to the provided naming convention.
 * @param filenameStem - The filename without its extension.
 * @param convention - The naming convention to apply.
 * @returns The converted filename stem.
 */
function convertFilenameStem(filenameStem: string, convention: Readonly<NamingConvention>): string {
  switch (convention.type) {
    case NamingConventionType.KEBAB_CASE:
      return NamingUtils.toKebabCase(filenameStem);
    case NamingConventionType.SNAKE_CASE:
      return NamingUtils.toSnakeCase(filenameStem);
    case NamingConventionType.CAMEL_CASE:
      return NamingUtils.toCamelCase(filenameStem);
    case NamingConventionType.PASCAL_CASE:
      return NamingUtils.toPascalCase(filenameStem);
    default:
      return filenameStem;
  }
}

/**
 * Applies lowercase normalization when the convention requires it.
 * @param convertedName - The converted filename stem.
 * @param convention - The naming convention that produced the stem.
 * @returns The normalized filename stem.
 */
function normalizeConvertedName(
  convertedName: string,
  convention: Readonly<NamingConvention>
): string {
  const preservesCase =
    convention.type === NamingConventionType.CAMEL_CASE ||
    convention.type === NamingConventionType.PASCAL_CASE;

  if (convention.lowercase && !preservesCase) {
    return convertedName.toLowerCase();
  }

  return convertedName;
}

export class NamingUtils implements INamingUtils {
  /**
   * Converts a string to kebab-case format.
   * @param str - The input string to convert
   * @returns The string converted to kebab-case
   */
  static toKebabCase(str: string): string {
    const withHyphens = str.replaceAll(/([a-z])([A-Z])/g, '$1-$2');
    const normalizedSeparators = withHyphens.replaceAll(/[\s_]+/g, '-');
    const cleaned = normalizedSeparators.replaceAll(/[^a-zA-Z0-9-]/g, '');
    return cleaned.toLowerCase();
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
    return str.toLowerCase().replaceAll(/[-_\s]+(.)?/g, capitalizeDelimitedGroup);
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
      .replaceAll(/[-_\s]+(.)?/g, capitalizeDelimitedGroup)
      .replaceAll(/^./g, capitalizeFirstCharacter);
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
  static applyNamingConvention(filename: string, convention: Readonly<NamingConvention>): string {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const convertedName = convertFilenameStem(nameWithoutExt, convention);
    const normalizedName = normalizeConvertedName(convertedName, convention);
    return normalizedName + ext.toLowerCase();
  }

  /**
   * Applies a naming convention to a filename.
   * @param filename - The filename to apply the convention to
   * @param convention - The naming convention to apply
   * @returns The filename with the naming convention applied
   */
  applyNamingConvention(filename: string, convention: Readonly<NamingConvention>): string {
    return NamingUtils.applyNamingConvention(filename, convention);
  }

  /**
   * Determines if a filename should be renamed according to the given convention.
   * @param filename - The filename to check
   * @param convention - The naming convention to check against
   * @returns True if the filename should be renamed, false otherwise
   */
  static shouldRename(filename: string, convention: Readonly<NamingConvention>): boolean {
    const converted = this.applyNamingConvention(filename, convention);
    return filename !== converted;
  }

  /**
   * Determines if a filename should be renamed according to the given convention.
   * @param filename - The filename to check
   * @param convention - The naming convention to check against
   * @returns True if the filename should be renamed, false otherwise
   */
  shouldRename(filename: string, convention: Readonly<NamingConvention>): boolean {
    return NamingUtils.shouldRename(filename, convention);
  }
}
