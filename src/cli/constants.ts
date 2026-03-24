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

const DEFAULT_MAX_DISPLAY_FILES = 5;

interface IConfigFileNames {
  readonly JSON: string;
  readonly YAML: string;
  readonly YML: string;
}

interface ICliConstants {
  readonly ORDERLY_DIR: string;
  readonly LOG_FILE: string;
  readonly MANIFEST_JSON: string;
  readonly MANIFEST_MD: string;
  readonly CONFIG_PREFIX: string;
  readonly DEFAULT_CONFIG_FORMAT: ConfigFileFormat;
  readonly VALID_FORMATS: readonly ConfigFileFormat[];
  readonly TOOL_NAME: string;
  readonly TOOL_DESCRIPTION: string;
  readonly MAX_DISPLAY_FILES: number;
}

interface ICommandMessages {
  readonly CONFIG_EXISTS: string;
  readonly CONFIG_CREATED: string;
  readonly CONFIG_AUTO_DISCOVERED: string;
  readonly INIT_FAILED: string;
  readonly FILES_FOUND: string;
  readonly OPERATIONS_PLANNED: string;
  readonly MANIFESTS_GENERATED: string;
  readonly ORGANIZED_SUCCESS: string;
  readonly ORGANIZATION_FAILED: string;
  readonly SCAN_SUCCESS: string;
  readonly SCAN_FAILED: string;
}

/**
 * Configuration file name constants
 */
export const CONFIG_FILE_NAMES: IConfigFileNames = {
  JSON: '.orderly.config.json',
  YAML: '.orderly.config.yaml',
  YML: '.orderly.yml'
};

/**
 * CLI constants
 */
export const CLI_CONSTANTS: ICliConstants = {
  ORDERLY_DIR: '.orderly',
  LOG_FILE: 'orderly.log',
  MANIFEST_JSON: 'manifest.json',
  MANIFEST_MD: 'manifest.md',
  CONFIG_PREFIX: '.orderly.config.',
  DEFAULT_CONFIG_FORMAT: ConfigFileFormat.YAML,
  VALID_FORMATS: [ConfigFileFormat.JSON, ConfigFileFormat.YAML, ConfigFileFormat.YML],
  TOOL_NAME: 'Orderly',
  TOOL_DESCRIPTION:
    'A configurable CLI tool for organizing files with naming conventions and full auditability',
  MAX_DISPLAY_FILES: DEFAULT_MAX_DISPLAY_FILES
};

/**
 * Command message templates
 */
export const COMMAND_MESSAGES: ICommandMessages = {
  CONFIG_EXISTS: 'Configuration file already exists: ',
  CONFIG_CREATED: 'Created configuration file: ',
  CONFIG_AUTO_DISCOVERED: 'Using config file found in target directory: ',
  INIT_FAILED: 'Init failed: ',
  FILES_FOUND: 'Found {0} files to process',
  OPERATIONS_PLANNED: 'Planned {0} operations',
  MANIFESTS_GENERATED: 'Manifests generated',
  ORGANIZED_SUCCESS: 'Successfully organized {0} files',
  ORGANIZATION_FAILED: 'Organization failed: ',
  SCAN_SUCCESS: 'Found {0} files in {1}',
  SCAN_FAILED: 'Scan failed: '
};

/**
 * Type representing valid configuration file formats
 */
export type ConfigFormat = ConfigFileFormat;
