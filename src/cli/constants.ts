/**
 * CLI-specific constants to avoid magic strings and numbers
 */

export const CLI_CONSTANTS = {
  ORDERLY_DIR: '.orderly',
  LOG_FILE: 'orderly.log',
  MANIFEST_JSON: 'manifest.json',
  MANIFEST_MD: 'manifest.md',
  CONFIG_JSON: 'orderly.config.json',
  CONFIG_YAML: '.orderly.yml',
  DEFAULT_FORMAT: 'yaml',
  VALID_FORMATS: ['json', 'yaml', 'yml'] as const,
  TOOL_NAME: 'Orderly',
  TOOL_DESCRIPTION:
    'A configurable CLI tool for organizing files with naming conventions and full auditability'
} as const;

export type ConfigFormat = (typeof CLI_CONSTANTS.VALID_FORMATS)[number];
