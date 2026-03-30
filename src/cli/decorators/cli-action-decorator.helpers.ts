import {
  createMethodDecorator,
  createWrappedMethodDecorator,
  createWrappedMethodDescriptor,
  invokeMethod,
  type IMethodExecutionRef
} from './method-decorator.helpers';

export type CliActionExecution = (this: unknown, ...args: readonly unknown[]) => unknown;

export type ICliActionExecutionRef = IMethodExecutionRef<CliActionExecution>;

/**
 * Creates a method decorator that wraps callable CLI action handlers.
 * @param wrapDescriptor - Function that creates a wrapped descriptor.
 * @returns Method decorator implementation.
 */
export function createCliActionMethodDecorator(
  wrapDescriptor: (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor
): MethodDecorator {
  return createMethodDecorator(wrapDescriptor);
}

/**
 * Creates a wrapped descriptor when the original value is callable.
 * @param descriptor - Original method descriptor.
 * @param createWrapper - Wrapper factory for the original method.
 * @returns Updated descriptor or the original descriptor copy when not callable.
 */
export function createWrappedCliActionDescriptor(
  descriptor: Readonly<PropertyDescriptor>,
  createWrapper: (originalMethodRef: Readonly<ICliActionExecutionRef>) => CliActionExecution
): PropertyDescriptor {
  return createWrappedMethodDescriptor(descriptor, isCliActionExecution, createWrapper);
}

/**
 * Creates a method decorator from a parameterized CLI action wrapper factory.
 * @param config - Configuration value forwarded to the wrapper factory.
 * @param createWrapperFactory - Factory that creates an action wrapper from the configuration value.
 * @returns Method decorator implementation.
 */
export function createWrappedCliActionMethodDecorator<TValue>(
  config: Readonly<{ value: TValue }>,
  createWrapperFactory: (
    value: TValue
  ) => (originalMethodRef: Readonly<ICliActionExecutionRef>) => CliActionExecution
): MethodDecorator {
  return createWrappedMethodDecorator(config, isCliActionExecution, createWrapperFactory);
}

/**
 * Invokes a CLI action method with the provided context and arguments.
 * @param originalMethodRef - Original action method reference.
 * @param context - Invocation context.
 * @param args - Invocation arguments.
 * @returns Original action return value.
 */
export function invokeCliAction(
  originalMethodRef: Readonly<ICliActionExecutionRef>,
  context: unknown,
  args: readonly unknown[]
): unknown {
  return invokeMethod(originalMethodRef, context, args);
}

/**
 * Returns whether a descriptor value can be wrapped as a CLI action method.
 * @param value - Descriptor value.
 * @returns True when the value is a callable CLI action method.
 */
export function isCliActionExecution(value: unknown): value is CliActionExecution {
  return typeof value === 'function';
}
