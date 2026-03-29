import type { ICommandResult } from '../interfaces';

import {
  createMethodDecorator,
  createWrappedMethodDecorator,
  createWrappedMethodDescriptor,
  invokeMethod,
  type IMethodExecutionRef
} from './method-decorator.helpers';

export type CommandExecution = (
  this: object,
  ...args: readonly unknown[]
) => Promise<ICommandResult> | ICommandResult;

export type ICommandExecutionRef = IMethodExecutionRef<CommandExecution>;
export type CommandMiddleware<TValue> = (
  value: TValue,
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
) => Promise<ICommandResult> | ICommandResult;

/**
 * Creates a method decorator that wraps callable command handlers.
 * @param wrapDescriptor - Function that creates a wrapped descriptor.
 * @returns Method decorator implementation.
 */
export function createCommandMethodDecorator(
  wrapDescriptor: (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor
): MethodDecorator {
  return createMethodDecorator(wrapDescriptor);
}

/**
 * Creates a method decorator from a plain command middleware function.
 * @param config - Configuration value forwarded to the middleware.
 * @param middleware - Middleware that executes the wrapped command behavior.
 * @returns Method decorator implementation.
 */
export function createCommandMiddlewareDecorator<TValue>(
  config: Readonly<{ value: TValue }>,
  middlewareRef: Readonly<{ invoke: CommandMiddleware<TValue> }>
): MethodDecorator {
  return createCommandMethodDecorator(
    createCommandMiddlewareDescriptorFactory(config, middlewareRef)
  );
}

/**
 * Creates a descriptor wrapper factory from a plain command middleware function.
 * @param config - Configuration value forwarded to the middleware.
 * @param middlewareRef - Middleware reference that executes the wrapped command behavior.
 * @returns Descriptor wrapper factory.
 */
function createCommandMiddlewareDescriptorFactory<TValue>(
  config: Readonly<{ value: TValue }>,
  middlewareRef: Readonly<{ invoke: CommandMiddleware<TValue> }>
): (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor {
  /**
   * Wraps one descriptor with the configured middleware-backed command wrapper.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor.
   */
  function wrapMiddlewareDescriptor(descriptor: Readonly<PropertyDescriptor>): PropertyDescriptor {
    return createWrappedDescriptor(
      descriptor,
      createConfiguredCommandMiddleware(config, middlewareRef)
    );
  }

  return wrapMiddlewareDescriptor;
}

/**
 * Creates a plain command wrapper from a command middleware function.
 * @param config - Configuration value forwarded to the middleware.
 * @param middlewareRef - Middleware that executes the wrapped command behavior.
 * @returns Command wrapper factory.
 */
export function createCommandMiddlewareWrapper<TValue>(
  config: Readonly<{ value: TValue }>,
  middlewareRef: Readonly<{ invoke: CommandMiddleware<TValue> }>
): (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution {
  return createConfiguredCommandMiddleware(config, middlewareRef);
}

/**
 * Creates a configured command middleware wrapper.
 * @param config - Configuration value forwarded to the middleware.
 * @param middlewareRef - Middleware reference that executes the wrapped command behavior.
 * @returns Command wrapper factory.
 */
function createConfiguredCommandMiddleware<TValue>(
  config: Readonly<{ value: TValue }>,
  middlewareRef: Readonly<{ invoke: CommandMiddleware<TValue> }>
): (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution {
  /**
   * Wraps the original command method with middleware behavior.
   * @param originalMethodRef - Original command method reference.
   * @returns Wrapped command execution.
   */
  function wrapCommandMethod(
    originalMethodRef: Readonly<ICommandExecutionRef>
  ): CommandExecution {
    return createMiddlewareExecution(config, middlewareRef, originalMethodRef);
  }

  return wrapCommandMethod;
}

/**
 * Creates one middleware-backed command execution.
 * @param config - Configuration value forwarded to the middleware.
 * @param middlewareRef - Middleware reference that executes the wrapped command behavior.
 * @param originalMethodRef - Original command method reference.
 * @returns Wrapped command execution.
 */
function createMiddlewareExecution<TValue>(
  config: Readonly<{ value: TValue }>,
  middlewareRef: Readonly<{ invoke: CommandMiddleware<TValue> }>,
  originalMethodRef: Readonly<ICommandExecutionRef>
): CommandExecution {
  /**
   * Executes the middleware-backed command wrapper.
   * @param this - Invocation context.
   * @param args - Command arguments.
   * @returns Middleware result.
   */
  function executeWithMiddleware(
    this: object,
    ...args: readonly unknown[]
  ): Promise<ICommandResult> | ICommandResult {
    return middlewareRef.invoke(config.value, originalMethodRef, this, args);
  }

  return executeWithMiddleware;
}

/**
 * Creates a method decorator from a parameterized command wrapper factory.
 * @param value - Configuration value forwarded to the wrapper factory.
 * @param createWrapperFactory - Factory that creates a command wrapper from the configuration value.
 * @returns Method decorator implementation.
 */
export function createWrappedCommandMethodDecorator<TValue>(
  config: Readonly<{ value: TValue }>,
  createWrapperFactory: (
    value: TValue
  ) => (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution
): MethodDecorator {
  return createWrappedMethodDecorator(config, isCommandExecution, createWrapperFactory);
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
  return createWrappedMethodDescriptor(descriptor, isCommandExecution, createWrapper);
}

/**
 * Invokes a command method with the provided context and arguments.
 * @param originalMethodRef - Original command method reference.
 * @param context - Invocation context.
 * @param args - Invocation arguments.
 * @returns Original command return value.
 */
export function invokeCommand(
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
): unknown {
  return invokeMethod(originalMethodRef, context, args);
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
