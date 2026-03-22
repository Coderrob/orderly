/**
 * Configuration file names in order of precedence.
 */
export const CONFIG_FILE_NAMES = [
  '.orderly.yml',
  '.orderly.yaml',
  '.orderly.config.yaml',
  '.orderly.config.json',
  'orderly.config.json'
] as const;

/**
 * Valid configuration file name type
 */
export enum ConfigFileName {
  OrderlyYml = '.orderly.yml',
  OrderlyYaml = '.orderly.yaml',
  OrderlyConfigYaml = '.orderly.config.yaml',
  OrderlyConfigJson = '.orderly.config.json',
  OrderlyConfigJson2 = 'orderly.config.json'
}

/**
 * Default file paths.
 */
export const DEFAULT_LOG_FILE = '.orderly/orderly.log' as const;
export const DEFAULT_MANIFEST_DIR = '.orderly' as const;
export const DEFAULT_MANIFEST_FILE = 'manifest.json' as const;
export const DEFAULT_MANIFEST_MD = 'manifest.md' as const;

/**
 * Default configuration values.
 */
export const DEFAULT_LOG_LEVEL = 'info' as const;
export const DEFAULT_DRY_RUN = false as const;
export const DEFAULT_GENERATE_MANIFEST = false as const;
export const DEFAULT_INCLUDE_HIDDEN = false as const;
export const DEFAULT_NAMING_CONVENTION = 'kebab-case' as const;

/**
 * File system constants.
 */
export const MAX_FILENAME_LENGTH = 255 as const;
export const RESERVED_NAMES = [
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9'
] as const;
