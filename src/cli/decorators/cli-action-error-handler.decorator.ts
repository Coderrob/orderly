/**
 * Decorates CLI action handlers to route uncaught errors through `handleError`.
 * @returns A method decorator that wraps action handlers with shared error routing.
 */
export function HandleCliActionErrors(): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      try {
        return await Promise.resolve(originalMethod.apply(this, args));
      } catch (error) {
        if (
          typeof this === 'object' &&
          this !== null &&
          'handleError' in this &&
          typeof (this as { handleError: (error: unknown) => void }).handleError === 'function'
        ) {
          (this as { handleError: (error: unknown) => void }).handleError(error);
          return undefined;
        }

        throw error;
      }
    };

    return descriptor;
  };
}
