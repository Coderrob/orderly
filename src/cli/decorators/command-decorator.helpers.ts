import type { ICommandResult } from '../interfaces';

export type CommandExecution = (
  this: object,
  ...args: readonly unknown[]
) => Promise<ICommandResult> | ICommandResult;

export interface ICommandExecutionRef {
  readonly invoke: CommandExecution;
}

/**
 * Creates a method decorator that wraps callable command handlers.
 * @param wrapDescriptor - Function that creates a wrapped descriptor.
 * @returns Method decorator implementation.
 */
export function createCommandMethodDecorator(
  wrapDescriptor: (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor
): MethodDecorator {
  /**
   * Applies command wrapping to the decorated method descriptor.
   * @param _target - Decorated class prototype.
   * @param _propertyKey - Decorated method key.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor.
   */
  function applyCommandDecorator(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: Readonly<PropertyDescriptor>
  ): PropertyDescriptor {
    return wrapDescriptor(descriptor);
  }

  return applyCommandDecorator;
}

/**
 * Creates a wrapped descriptor when the original value is callable.
 * @param descriptor - Original method descriptor.
 * @param createWrapper - Wrapper factory for the original method.
 * @returns Updated descriptor or the original descriptor copy when not callable.
 */
export function createWrappedDescriptor(
  descriptor: Readonly<PropertyDescriptor>,
  createWrapper: (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isCommandExecution(originalMethod)) {
    return { ...descriptor };
  }

  return {
    ...descriptor,
    value: createWrapper({ invoke: originalMethod })
  };
}

/**
 * Invokes a command method with the provided context and arguments.
 * @param originalMethodRef - Original command method reference.
 * @param context - Invocation context.
 * @param args - Invocation arguments.
 * @returns Original command return value.
 */
export async function invokeCommand(
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
): Promise<unknown> {
  return Promise.resolve(Function.prototype.apply.call(originalMethodRef.invoke, context, args));
}

/**
 * Returns whether a descriptor value can be wrapped as a command method.
 * @param value - Descriptor value.
 * @returns True when the value is a callable command method.
 */
export function isCommandExecution(value: unknown): value is CommandExecution {
  return typeof value === 'function';
}

/**
 * Returns whether an unknown value matches ICommandResult.
 * @param value - Value to inspect.
 * @returns True when the value matches ICommandResult.
 */
export function isCommandResult(value: unknown): value is ICommandResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'exitCode' in value &&
    'message' in value
  );
}
