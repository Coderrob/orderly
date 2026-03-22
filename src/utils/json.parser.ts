import { Logger } from '../logger/logger';

import { FileSystemUtils } from './file-system-utils';
import { isObject } from './guards';

export interface IJsonWriteResult {
  success: boolean;
  error?: string;
}

const DEFAULT_JSON_INDENT = 0;

/**
 * Formats an object as a pretty-printed JSON string.
 * @param obj - The object to format.
 * @param indent - The number of spaces for indentation (default: 0).
 * @returns The formatted JSON string.
 */
export function formatJson(obj: unknown, indent: number = DEFAULT_JSON_INDENT): string {
  return JSON.stringify(obj, null, indent);
}

/**
 * Parses a JSON file and returns the parsed object.
 * @param filePath - The path to the JSON file.
 * @param logger - Optional logger instance.
 * @returns The parsed JSON object or null if parsing failed.
 */
export function parseJsonFile(
  filePath: string,
  logger: Readonly<Logger>
): Record<string, unknown> | null {
  try {
    const content = FileSystemUtils.readFileSync(filePath);
    const parsed = parseJsonObject(content, logger, 'Failed to parse JSON file');
    if (parsed === null) {
      return null;
    }
    logger.debug('Parsed JSON file', { filePath });
    return parsed;
  } catch (e) {
    logger.error('Failed to parse JSON file', { error: String(e), filePath });
    return null;
  }
}

/**
 * Parses a JSON string and validates that its root value is an object.
 * @param jsonValue - The JSON string to parse.
 * @param logger - The logger used for parse failures.
 * @param failureMessage - The message to log when parsing fails.
 * @returns The parsed object or null when parsing fails.
 */
function parseJsonObject(
  jsonValue: string,
  logger: Readonly<Logger>,
  failureMessage: string
): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(jsonValue);
    if (!isObject(parsed)) {
      logger.error(failureMessage, { error: 'Parsed JSON root is not an object' });
      return null;
    }
    return parsed;
  } catch (e) {
    logger.error(failureMessage, { error: String(e) });
    return null;
  }
}

/**
 * Safely parses a JSON string.
 * @param jsonString - The JSON string to parse.
 * @param logger - Optional logger instance.
 * @returns The parsed object or null if parsing failed.
 */
export function safeJsonParse(
  jsonString: string,
  logger: Readonly<Logger>
): Record<string, unknown> | null {
  const parsed = parseJsonObject(jsonString, logger, 'Failed to parse JSON string');
  if (parsed !== null) {
    return parsed;
  }
  try {
    JSON.parse(jsonString);
  } catch (e) {
    logger.warn('Failed to parse JSON string', { error: String(e) });
  }
  return null;
}

/**
 * Writes an object to a JSON file.
 * @param filePath - The path to the JSON file.
 * @param data - The data to write.
 * @param logger - Optional logger instance.
 * @returns A result describing whether the write succeeded.
 */
export function writeJsonFile(
  filePath: string,
  data: Readonly<Record<string, unknown>>,
  logger: Readonly<Logger>
): IJsonWriteResult {
  try {
    const jsonString = formatJson(data);
    FileSystemUtils.writeFileSync(filePath, jsonString);
    logger.debug('Wrote JSON file', { filePath });
    return { success: true };
  } catch (e) {
    const error = String(e);
    logger.error('Failed to write JSON file', { error, filePath });
    return { error, success: false };
  }
}
