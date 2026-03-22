import type { ICommandResult } from '../interfaces';

type CommandExecution = (...args: unknown[]) => Promise<ICommandResult> | ICommandResult;

/**
 * Adds lightweight timing telemetry to command handler results.
 * @param commandName - Name of the command being measured.
 * @returns A method decorator that appends duration metadata to the command result message.
 */
export function WithCommandTelemetry(commandName: string): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as CommandExecution;

    descriptor.value = async function (...args: unknown[]): Promise<ICommandResult> {
      const startedAt = Date.now();
      const result = await Promise.resolve(originalMethod.apply(this, args));
      const durationMs = Date.now() - startedAt;
      const telemetrySuffix = `${commandName} completed in ${durationMs}ms`;

      return {
        ...result,
        message: result.message ? `${result.message} (${telemetrySuffix})` : telemetrySuffix
      };
    };

    return descriptor;
  };
}
