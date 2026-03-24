import { Logger } from '../logger/logger';

import { FileSystemUtils } from './file-system-utils';
import { isObject } from './guards';

export interface IJsonWriteResult {
  readonly success: boolean;
  readonly error?: string;
}

interface IJsonParseFailure {
  readonly success: false;
}

interface IJsonParseSuccess {
  readonly success: true;
  readonly value: Record<string, unknown>;
}

type JsonParseResult = IJsonParseFailure | IJsonParseSuccess;

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
 * @param logger - The logger used for success and error reporting.
 * @returns The parsed JSON object or null if parsing failed.
 */
export function parseJsonFile(
  filePath: string,
  logger: Readonly<Logger>
): Record<string, unknown> | null {
  try {
    const content = FileSystemUtils.readFileSync(filePath);
    const parsed = parseJsonObject(content, logger, 'Failed to parse JSON file', { filePath });
    if (!parsed.success) {
      return null;
    }

    logger.debug('Parsed JSON file', { filePath });
    return parsed.value;
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
 * @param details - Additional structured log details to include on failure.
 * @returns A parse result containing either the parsed object or a failure marker.
 */
function parseJsonObject(
  jsonValue: string,
  logger: Readonly<Logger>,
  failureMessage: string,
  details: Readonly<Record<string, string>> = {}
): JsonParseResult {
  try {
    const parsed: unknown = JSON.parse(jsonValue);
    if (!isObject(parsed)) {
      logger.error(failureMessage, { ...details, error: 'Parsed JSON root is not an object' });
      return { success: false };
    }

    return { success: true, value: parsed };
  } catch (e) {
    logger.error(failureMessage, { ...details, error: String(e) });
    return { success: false };
  }
}

/**
 * Safely parses a JSON string.
 * @param jsonString - The JSON string to parse.
 * @param logger - The logger used for parse warnings.
 * @returns The parsed object or null if parsing failed.
 */
export function safeJsonParse(
  jsonString: string,
  logger: Readonly<Logger>
): Record<string, unknown> | null {
  const parsed = parseJsonObject(jsonString, logger, 'Failed to parse JSON string');
  if (parsed.success) {
    return parsed.value;
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
 * @param logger - The logger used for success and error reporting.
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
