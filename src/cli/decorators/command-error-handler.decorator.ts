import { ExitCode } from '../constants';
import type { ICommandResult } from '../interfaces';

type CommandMethod = (...args: unknown[]) => Promise<ICommandResult> | ICommandResult;

/**
 * Wraps a command handler method with consistent CLI error handling.
 * Converts thrown sync/async errors into a standard ICommandResult payload.
 * @param errorPrefix - Message prefix used for command failures
 * @returns A method decorator that converts thrown errors into failed command results.
 */
export function HandleCommandErrors(errorPrefix: string): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as CommandMethod;

    descriptor.value = async function (...args: unknown[]): Promise<ICommandResult> {
      try {
        return await Promise.resolve(originalMethod.apply(this, args));
      } catch (error) {
        return {
          success: false,
          exitCode: ExitCode.ERROR,
          message: `${errorPrefix}${error instanceof Error ? error.message : String(error)}`
        };
      }
    };

    return descriptor;
  };
}
