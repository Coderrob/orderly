import type { NamingConvention } from '../config/types';

export interface INamingUtils {
  toKebabCase(str: string): string;
  toSnakeCase(str: string): string;
  toCamelCase(str: string): string;
  toPascalCase(str: string): string;
  applyNamingConvention(filename: string, convention: Readonly<NamingConvention>): string;
  shouldRename(filename: string, convention: Readonly<NamingConvention>): boolean;
}
