import { ExitCode } from '../constants';
import type { ICommandResult } from '../interfaces';

type CommandMethod = (
  this: object,
  ...args: readonly unknown[]
) => Promise<ICommandResult> | ICommandResult;

interface ICommandMethodRef {
  readonly invoke: CommandMethod;
}

/**
 * Builds a standardized failed command result.
 * @param errorPrefix - Message prefix for command failures.
 * @param error - Error value thrown by command execution.
 * @returns Failure command result.
 */
function buildFailureResult(errorPrefix: string, error: unknown): ICommandResult {
  return {
    success: false,
    exitCode: ExitCode.ERROR,
    message: `${errorPrefix}${error instanceof Error ? error.message : String(error)}`
  };
}

/**
 * Produces a descriptor whose value includes shared error handling behavior.
 * @param errorPrefix - Message prefix for command failures.
 * @param descriptor - Original method descriptor.
 * @returns Updated descriptor with error handling wrapper.
 */
function createErrorHandledDescriptor(
  errorPrefix: string,
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isCommandMethod(originalMethod)) {
    return { ...descriptor };
  }

  return {
    ...descriptor,
    value: createErrorHandledWrapper(errorPrefix, { invoke: originalMethod })
  };
}

/**
 * Wraps a command method with consistent error handling behavior.
 * @param errorPrefix - Message prefix for command failures.
 * @param originalMethod - Original command method.
 * @returns Error-handled command method.
 */
function createErrorHandledWrapper(
  errorPrefix: string,
  originalMethodRef: Readonly<ICommandMethodRef>
): CommandMethod {
  /**
   * Executes the wrapped command and normalizes thrown errors.
   * @param this - Invocation context.
   * @param args - Command arguments.
   * @returns Successful or failed command result.
   */
  async function executeWithErrorHandling(
    this: object,
    ...args: readonly unknown[]
  ): Promise<ICommandResult> {
    return runErrorHandledCommand(errorPrefix, originalMethodRef, this, args);
  }
  return executeWithErrorHandling;
}

/**
 * Executes a command and maps thrown errors to a failed result payload.
 * @param errorPrefix - Message prefix for command failures.
 * @param originalMethod - Original command method.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Successful or failed command result.
 */
function createErrorHandlerMethodDecorator(errorPrefix: string): MethodDecorator {
  /**
   * Applies error handling wrapping to the decorated method.
   * @param _target - Decorated class prototype.
   * @param _propertyKey - Decorated method key.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor with shared error handling behavior.
   */
  function applyCommandErrorHandling(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: Readonly<PropertyDescriptor>
  ): PropertyDescriptor {
    return createErrorHandledDescriptor(errorPrefix, descriptor);
  }
  return applyCommandErrorHandling;
}

/**
 * Creates a method decorator that applies command error handling.
 * @param errorPrefix - Message prefix used for command failures.
 * @returns Decorator implementation.
 */
export function HandleCommandErrors(errorPrefix: string): MethodDecorator {
  return createErrorHandlerMethodDecorator(errorPrefix);
}

/**
 * Checks whether a descriptor value can be wrapped as a command method.
 * @param value - Descriptor value.
 * @returns True when the value is a callable command method.
 */
function isCommandMethod(value: unknown): value is CommandMethod {
  return typeof value === 'function';
}

/**
 * Checks whether an unknown value matches ICommandResult.
 * @param value - Descriptor value.
 * @returns True when value matches ICommandResult shape.
 */
function isCommandResult(value: unknown): value is ICommandResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'exitCode' in value &&
    'message' in value
  );
}

/**
 * Executes a command and maps thrown errors to a failed result payload.
 * @param errorPrefix - Message prefix for command failures.
 * @param originalMethodRef - Original command method reference.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Successful or failed command result.
 */
async function runErrorHandledCommand(
  errorPrefix: string,
  originalMethodRef: Readonly<ICommandMethodRef>,
  context: object,
  args: readonly unknown[]
): Promise<ICommandResult> {
  try {
    const maybeResult: unknown = await Promise.resolve(
      Function.prototype.apply.call(originalMethodRef.invoke, context, args)
    );
    return isCommandResult(maybeResult)
      ? maybeResult
      : buildFailureResult(errorPrefix, 'Command returned an invalid result payload');
  } catch (error) {
    return buildFailureResult(errorPrefix, error);
  }
}
