import {
  ReadonlyExtensionList,
  DEFAULT_CATEGORIES,
  DEFAULT_DRY_RUN,
  DEFAULT_GENERATE_MANIFEST,
  DEFAULT_INCLUDE_HIDDEN
} from '../constants';
import { IDedupeConfig } from '../dedupe/types';
import { LogLevel } from '../types/logging';

export interface CategoryRule {
  name: string;
  extensions: ReadonlyExtensionList;
  patterns?: string[];
  targetFolder?: string;
}

export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml'
}

export enum NamingConventionType {
  KEBAB_CASE = 'kebab-case',
  SNAKE_CASE = 'snake_case',
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase'
}

export interface NamingConvention {
  type: NamingConventionType;
  lowercase?: boolean;
}

export interface CollisionResolutionConfig {
  strategy: 'skip' | 'keep-both' | 'replace';
  renamePattern?: string;
  maxAttempts?: number;
  interactive?: boolean;
}

export interface OrderlyConfig {
  categories: CategoryRule[];
  namingConvention: NamingConvention;
  excludePatterns: string[];
  includeHidden: boolean;
  dryRun: boolean;
  generateManifest: boolean;
  logLevel: LogLevel;
  logFile?: string;
  targetDirectory?: string;
  dedupe?: IDedupeConfig;
  collisionResolution?: CollisionResolutionConfig;
}

export const DEFAULT_CONFIG: OrderlyConfig = {
  categories: DEFAULT_CATEGORIES as CategoryRule[],
  namingConvention: {
    type: NamingConventionType.KEBAB_CASE,
    lowercase: true
  },
  excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.DS_Store'],
  includeHidden: DEFAULT_INCLUDE_HIDDEN,
  dryRun: DEFAULT_DRY_RUN,
  generateManifest: DEFAULT_GENERATE_MANIFEST,
  logLevel: LogLevel.INFO
};
