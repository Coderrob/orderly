import { Logger } from '../logger/logger';
import { FileSystemUtils } from './file-system-utils';

/**
 * Formats an object as a pretty-printed JSON string.
 * @param obj - The object to format.
 * @param indent - The number of spaces for indentation (default: 0).
 * @returns The formatted JSON string.
 */
export function formatJson(obj: unknown, indent: number = 0): string {
  return JSON.stringify(obj, null, indent);
}

/**
 * Parses a JSON file and returns the parsed object.
 * @param filePath - The path to the JSON file.
 * @param logger - Optional logger instance.
 * @returns The parsed JSON object or null if parsing failed.
 */
export function parseJsonFile<T = Record<string, unknown>>(
  filePath: string,
  logger: Logger
): T | null {
  try {
    const content = FileSystemUtils.readFileSync(filePath);
    const parsed = JSON.parse(content) as T;
    logger.debug('Parsed JSON file', { filePath });
    return parsed;
  } catch (e) {
    logger.error('Failed to parse JSON file', { error: String(e), filePath });
    return null;
  }
}

/**
 * Writes an object to a JSON file.
 * @param filePath - The path to the JSON file.
 * @param data - The data to write.
 * @param logger - Optional logger instance.
 * @returns True if the write was successful, false otherwise.
 */
export function writeJsonFile<T = Record<string, unknown>>(
  filePath: string,
  data: T,
  logger: Logger
): boolean {
  try {
    const jsonString = formatJson(data);
    FileSystemUtils.writeFileSync(filePath, jsonString);
    logger.debug('Wrote JSON file', { filePath });
    return true;
  } catch (e) {
    logger.error('Failed to write JSON file', { error: String(e), filePath });
    return false;
  }
}

/**
 * Safely parses a JSON string.
 * @param jsonString - The JSON string to parse.
 * @param logger - Optional logger instance.
 * @returns The parsed object or null if parsing failed.
 */
export function safeJsonParse<T = Record<string, unknown>>(
  jsonString: string,
  logger: Logger
): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    logger.warn('Failed to parse JSON string', { error: String(e) });
    return null;
  }
}
