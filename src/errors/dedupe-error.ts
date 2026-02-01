import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class HashingError extends OrderlyError {
  readonly code = ErrorCode.HASHING_FAILED;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   *
   * @param path
   * @param cause
   */
  constructor(path: string, cause: string) {
    super(`Failed to hash file: ${path}`, { path, cause });
  }
}

export class MetadataReadError extends OrderlyError {
  readonly code = ErrorCode.METADATA_READ_FAILED;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   *
   * @param path
   * @param metadataType
   * @param cause
   */
  constructor(path: string, metadataType: string, cause: string) {
    super(`Failed to read ${metadataType} metadata: ${path}`, { path, metadataType, cause });
  }
}

export class StrategyError extends OrderlyError {
  readonly code = ErrorCode.STRATEGY_FAILED;
  readonly category = ErrorCategory.VALIDATION;

  /**
   *
   * @param strategyName
   * @param file
   * @param cause
   */
  constructor(strategyName: string, file: string, cause: string) {
    super(`Strategy '${strategyName}' failed for file: ${file}`, { strategyName, file, cause });
  }
}
