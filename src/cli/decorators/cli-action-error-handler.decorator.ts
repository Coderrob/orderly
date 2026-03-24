interface IErrorHandlerHost {
  handleError(error: unknown): void;
}

interface ICliActionMethodReference {
  readonly method: CliActionMethod;
}

type CliActionMethod = (this: unknown, ...args: readonly unknown[]) => unknown;

/**
 * Creates a wrapped CLI action that routes thrown errors to `handleError`.
 * @param methodReference - Original method implementation.
 * @returns Wrapped action method.
 */
function createWrappedCliAction(
  methodReference: Readonly<ICliActionMethodReference>
): CliActionMethod {
  /**
   * Executes a wrapped CLI action method.
   * @param this - Decorated method receiver.
   * @param args - Arguments forwarded to the original action.
   * @returns The original result, or undefined when the error was routed to `handleError`.
   */
  async function wrappedCliAction(this: unknown, ...args: readonly unknown[]): Promise<unknown> {
    try {
      return await Promise.resolve(methodReference.method.call(this, ...args));
    } catch (error) {
      return handleCliActionError(this, error);
    }
  }

  return wrappedCliAction;
}

/**
 * Applies shared CLI action error handling to a method descriptor.
 * @param _target - Decorated prototype.
 * @param _propertyKey - Decorated method name.
 * @param descriptor - Method descriptor to wrap.
 * @returns A descriptor with a wrapped action handler.
 */
function decorateCliActionHandler(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  const originalMethod = getCliActionMethod(descriptor);
  if (!originalMethod) {
    return { ...descriptor };
  }

  return {
    ...descriptor,
    value: createWrappedCliAction({ method: originalMethod })
  };
}

/**
 * Returns a CLI action method from the descriptor when one is present.
 * @param descriptor - Method descriptor to inspect.
 * @returns The original CLI action method, or undefined when the descriptor is not callable.
 */
function getCliActionMethod(descriptor: Readonly<PropertyDescriptor>): CliActionMethod | undefined {
  const descriptorValue: unknown = descriptor.value;
  return isCliActionMethod(descriptorValue) ? descriptorValue : undefined;
}

/**
 * Routes a CLI action error to `handleError` when available.
 * @param actionHost - Decorated method receiver.
 * @param error - Error thrown during action execution.
 * @returns Undefined when handled, otherwise a rejected promise preserving the original failure.
 */
function handleCliActionError(actionHost: unknown, error: unknown): Promise<never> | undefined {
  if (hasHandleError(actionHost)) {
    actionHost.handleError(error);
    return undefined;
  }

  return Promise.reject(error instanceof Error ? error : new Error(String(error)));
}

/**
 * Decorates CLI action handlers to route uncaught errors through `handleError`.
 * @returns A method decorator that wraps action handlers with shared error routing.
 */
export function HandleCliActionErrors(): MethodDecorator {
  return decorateCliActionHandler;
}

/**
 * Returns whether a value exposes a callable `handleError` method.
 * @param value - Value to inspect.
 * @returns True when the value can handle CLI action errors.
 */
function hasHandleError(value: unknown): value is IErrorHandlerHost {
  return (
    typeof value === 'object' &&
    value !== null &&
    'handleError' in value &&
    typeof value.handleError === 'function'
  );
}

/**
 * Returns whether a value is a callable CLI action method.
 * @param value - Value to inspect.
 * @returns True when the value matches the CLI action method signature.
 */
function isCliActionMethod(value: unknown): value is CliActionMethod {
  return typeof value === 'function';
}
