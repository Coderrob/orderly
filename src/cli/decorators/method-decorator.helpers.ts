type MethodLike = (this: never, ...args: readonly never[]) => unknown;

export interface IMethodExecutionRef<TExecution extends MethodLike> {
  readonly invoke: TExecution;
}

export type MethodExecution = (this: unknown, ...args: readonly unknown[]) => unknown;

/**
 * Creates a method decorator that wraps callable methods.
 * @param wrapDescriptor - Function that creates a wrapped descriptor.
 * @returns Method decorator implementation.
 */
export function createMethodDecorator(
  wrapDescriptor: (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor
): MethodDecorator {
  /**
   * Applies method wrapping to the decorated method descriptor.
   * @param _target - Decorated class prototype.
   * @param _propertyKey - Decorated method key.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor.
   */
  function applyMethodDecorator(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: Readonly<PropertyDescriptor>
  ): PropertyDescriptor {
    return wrapDescriptor(descriptor);
  }

  return applyMethodDecorator;
}

/**
 * Creates a method decorator from a parameterized method wrapper factory.
 * @param config - Configuration value forwarded to the wrapper factory.
 * @param isExecution - Type guard for compatible method values.
 * @param createWrapperFactory - Factory that creates a method wrapper from the configuration value.
 * @returns Method decorator implementation.
 */
export function createWrappedMethodDecorator<TValue, TExecution extends MethodLike>(
  config: Readonly<{ value: TValue }>,
  isExecution: (value: unknown) => value is TExecution,
  createWrapperFactory: (
    value: TValue
  ) => (originalMethodRef: Readonly<IMethodExecutionRef<TExecution>>) => TExecution
): MethodDecorator {
  return createMethodDecorator(
    createWrappedMethodDescriptorFactory(config, isExecution, createWrapperFactory)
  );
}

/**
 * Creates a wrapped descriptor when the original value is callable.
 * @param descriptor - Original method descriptor.
 * @param isExecution - Type guard for compatible method values.
 * @param createWrapper - Wrapper factory for the original method.
 * @returns Updated descriptor or the original descriptor copy when not callable.
 */
export function createWrappedMethodDescriptor<TExecution extends MethodLike>(
  descriptor: Readonly<PropertyDescriptor>,
  isExecution: (value: unknown) => value is TExecution,
  createWrapper: (originalMethodRef: Readonly<IMethodExecutionRef<TExecution>>) => TExecution
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isExecution(originalMethod)) {
    return { ...descriptor };
  }

  return {
    ...descriptor,
    value: createWrapper({ invoke: originalMethod })
  };
}

/**
 * Creates a descriptor wrapper factory from a parameterized method wrapper factory.
 * @param config - Configuration value forwarded to the wrapper factory.
 * @param isExecution - Type guard for compatible method values.
 * @param createWrapperFactory - Factory that creates a method wrapper from the configuration value.
 * @returns Descriptor wrapper factory.
 */
function createWrappedMethodDescriptorFactory<TValue, TExecution extends MethodLike>(
  config: Readonly<{ value: TValue }>,
  isExecution: (value: unknown) => value is TExecution,
  createWrapperFactory: (
    value: TValue
  ) => (originalMethodRef: Readonly<IMethodExecutionRef<TExecution>>) => TExecution
): (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor {
  /**
   * Wraps one descriptor with the configured method wrapper.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor.
   */
  function wrapConfiguredDescriptor(descriptor: Readonly<PropertyDescriptor>): PropertyDescriptor {
    return createWrappedMethodDescriptor(
      descriptor,
      isExecution,
      createWrapperFactory(config.value)
    );
  }

  return wrapConfiguredDescriptor;
}

/**
 * Invokes a method with the provided context and arguments.
 * @param originalMethodRef - Original method reference.
 * @param context - Invocation context.
 * @param args - Invocation arguments.
 * @returns Original method return value.
 */
export function invokeMethod<TExecution extends MethodLike>(
  originalMethodRef: Readonly<IMethodExecutionRef<TExecution>>,
  context: unknown,
  args: readonly unknown[]
): unknown {
  return Function.prototype.apply.call(originalMethodRef.invoke, context, args);
}
