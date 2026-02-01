/**
 * CLI-specific constants to avoid magic strings and numbers
 */

/**
 * Exit codes for CLI commands
 */
export enum ExitCode {
  SUCCESS = 0,
  ERROR = 1
}

/**
 * Configuration file formats
 */
export enum ConfigFileFormat {
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml'
}

/**
 * Configuration file name constants
 */
export const CONFIG_FILE_NAMES = {
  JSON: '.orderly.config.json',
  YAML: '.orderly.config.yaml',
  YML: '.orderly.yml'
} as const;

/**
 * CLI constants
 */
export const CLI_CONSTANTS = {
  ORDERLY_DIR: '.orderly',
  LOG_FILE: 'orderly.log',
  MANIFEST_JSON: 'manifest.json',
  MANIFEST_MD: 'manifest.md',
  CONFIG_PREFIX: '.orderly.config.',
  DEFAULT_CONFIG_FORMAT: ConfigFileFormat.YAML,
  VALID_FORMATS: [ConfigFileFormat.JSON, ConfigFileFormat.YAML, ConfigFileFormat.YML] as const,
  TOOL_NAME: 'Orderly',
  TOOL_DESCRIPTION:
    'A configurable CLI tool for organizing files with naming conventions and full auditability',
  MAX_DISPLAY_FILES: 5
} as const;

/**
 * Command message templates
 */
export const COMMAND_MESSAGES = {
  CONFIG_EXISTS: 'Configuration file already exists: ',
  CONFIG_CREATED: 'Created configuration file: ',
  INIT_FAILED: 'Init failed: ',
  FILES_FOUND: 'Found {0} files to process',
  OPERATIONS_PLANNED: 'Planned {0} operations',
  MANIFESTS_GENERATED: 'Manifests generated',
  ORGANIZED_SUCCESS: 'Successfully organized {0} files',
  ORGANIZATION_FAILED: 'Organization failed: ',
  SCAN_SUCCESS: 'Found {0} files in {1}',
  SCAN_FAILED: 'Scan failed: '
} as const;

export type ConfigFormat = (typeof CLI_CONSTANTS.VALID_FORMATS)[number];
