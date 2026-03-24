import * as path from 'node:path';

import * as yaml from 'js-yaml';

import { OrderlyConfig, ConfigFormat } from '../config/types';
import { ConfigParseError, UnsupportedConfigFormatError, InvalidFormatError } from '../errors';

import { FileSystemUtils } from './file-system-utils';
import { isObject } from './guards';

const JSON_EXTENSION = '.json';
const YML_EXTENSION = '.yml';
const YAML_EXTENSION = '.yaml';
const JSON_INDENT_SPACES = 2;
const JSON_FORMAT = 'json';
const YAML_FORMAT = 'yaml';
const CONFIG_ROOT_OBJECT_ERROR = 'Config root must be an object';

interface IConfigParseSuccess {
  readonly success: true;
  readonly value: Partial<OrderlyConfig>;
}

interface IConfigParseFailure {
  readonly error: Error;
  readonly success: false;
}

export type ConfigParseResult = IConfigParseFailure | IConfigParseSuccess;

interface IConfigStringifySuccess {
  readonly success: true;
  readonly value: string;
}

interface IConfigStringifyFailure {
  readonly error: Error;
  readonly success: false;
}

export type ConfigStringifyResult = IConfigStringifyFailure | IConfigStringifySuccess;

/* istanbul ignore next */
export interface IConfigParser {
  parse(filePath: string): ConfigParseResult;
  stringify(config: Readonly<OrderlyConfig>, format: ConfigFormat | string): ConfigStringifyResult;
}

export class ConfigParser implements IConfigParser {
  /**
   * Parses a configuration file and returns either the parsed config or an explicit failure.
   * @param filePath - Path to the configuration file (must be .json, .yml, or .yaml)
   * @returns A parse result containing either a partial config value or a parse error.
   */
  static parse(filePath: string): ConfigParseResult {
    const ext = path.extname(filePath).toLowerCase();
    const content = FileSystemUtils.readFileSync(filePath);

    if (ext === JSON_EXTENSION) {
      return this.parseConfigContent(filePath, content, parseJsonConfig);
    }

    if (ext === YML_EXTENSION || ext === YAML_EXTENSION) {
      return this.parseConfigContent(filePath, content, parseYamlConfig);
    }

    return { error: new UnsupportedConfigFormatError(ext), success: false };
  }

  /**
   * Instance method that parses a configuration file
   * @param filePath - Path to the configuration file (must be .json, .yml, or .yaml)
   * @returns A parse result containing either a partial config value or a parse error.
   */
  parse(filePath: string): ConfigParseResult {
    return ConfigParser.parse(filePath);
  }

  /**
   * Serializes a config object to JSON or YAML.
   * @param config - The configuration object to serialize
   * @param format - The output format (JSON or YAML)
   * @returns A stringify result containing either serialized content or an invalid-format error.
   */
  static stringify(
    config: Readonly<OrderlyConfig>,
    format: ConfigFormat | string
  ): ConfigStringifyResult {
    const normalizedFormat = String(format);

    if (normalizedFormat === JSON_FORMAT) {
      return { success: true, value: JSON.stringify(config, null, JSON_INDENT_SPACES) };
    }

    if (normalizedFormat === YAML_FORMAT) {
      return { success: true, value: yaml.dump(config) };
    }

    return { error: new InvalidFormatError(normalizedFormat, 'json or yaml'), success: false };
  }

  /**
   * Instance method that serializes a configuration object to string
   * @param config - The configuration object to serialize
   * @param format - The output format (JSON or YAML)
   * @returns A stringify result containing either serialized content or an invalid-format error.
   */
  stringify(config: Readonly<OrderlyConfig>, format: ConfigFormat | string): ConfigStringifyResult {
    return ConfigParser.stringify(config, format);
  }

  /**
   * Parses content with a format-specific parser and normalizes errors.
   * @param filePath - Path being parsed for error context.
   * @param content - Raw file contents.
   * @param parser - Format-specific parser callback.
   * @returns A parse result containing either a config object or a parse error.
   */
  private static parseConfigContent(
    filePath: string,
    content: string,
    parser: (content: string) => unknown
  ): ConfigParseResult {
    try {
      const parsed = parser(content);
      if (!isObject(parsed)) return buildConfigParseFailure(filePath, CONFIG_ROOT_OBJECT_ERROR);

      return { success: true, value: parsed };
    } catch (error) {
      return buildConfigParseFailure(
        filePath,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

/**
 * Creates a config parse failure result with a normalized error.
 * @param filePath - Path being parsed for error context.
 * @param cause - Human-readable parse failure cause.
 * @returns Failed parse result.
 */
function buildConfigParseFailure(filePath: string, cause: string): ConfigParseResult {
  return {
    error: new ConfigParseError(filePath, cause),
    success: false
  };
}

/**
 * Parses JSON config content.
 * @param content - Raw JSON content.
 * @returns The parsed JSON value.
 */
function parseJsonConfig(content: string): unknown {
  return JSON.parse(content);
}

/**
 * Parses YAML config content.
 * @param content - Raw YAML content.
 * @returns The parsed YAML value.
 */
function parseYamlConfig(content: string): unknown {
  return yaml.load(content);
}
