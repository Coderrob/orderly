interface IErrorHandlerHost {
  handleError(error: unknown): void;
}

import {
  createWrappedCliActionMethodDecorator,
  invokeCliAction,
  type CliActionExecution,
  type ICliActionExecutionRef
} from './cli-action-decorator.helpers';

/**
 * Creates a CLI action wrapper factory for error handling.
 * @returns Action wrapper factory.
 */
function createCliActionErrorWrapperFactory(): (
  originalMethodRef: Readonly<ICliActionExecutionRef>
) => CliActionExecution {
  /**
   * Wraps the original CLI action method with shared error routing behavior.
   * @param originalMethodRef - Original action method reference.
   * @returns Wrapped action execution.
   */
  function wrapCliActionErrorMethod(
    originalMethodRef: Readonly<ICliActionExecutionRef>
  ): CliActionExecution {
    return createWrappedCliAction(originalMethodRef);
  }

  return wrapCliActionErrorMethod;
}

/**
 * Creates a wrapped CLI action that routes thrown errors to `handleError`.
 * @param methodReference - Original method implementation.
 * @returns Wrapped action method.
 */
function createWrappedCliAction(
  methodReference: Readonly<ICliActionExecutionRef>
): CliActionExecution {
  /**
   * Executes a wrapped CLI action method.
   * @param this - Decorated method receiver.
   * @param args - Arguments forwarded to the original action.
   * @returns The original result, or undefined when the error was routed to `handleError`.
   */
  async function wrappedCliAction(this: unknown, ...args: readonly unknown[]): Promise<unknown> {
    try {
      return await invokeCliAction(methodReference, this, args);
    } catch (error) {
      return handleCliActionError(this, error);
    }
  }

  return wrappedCliAction;
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
  return createWrappedCliActionMethodDecorator(
    { value: undefined },
    createCliActionErrorWrapperFactory
  );
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
