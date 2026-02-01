import { IOrderlyError, ErrorCategory, ErrorCode } from './interfaces';

/**
 * Abstract base class for all Orderly errors.
 * Implements IOrderlyError interface.
 */
export abstract class OrderlyError extends Error implements IOrderlyError {
  abstract readonly code: ErrorCode;
  abstract readonly category: ErrorCategory;
  readonly context?: Record<string, unknown>;

  /**
   *
   * @param message
   * @param context
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Creates a JSON representation for logging/serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context
    };
  }
}
