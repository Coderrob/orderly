import type { ICommandResult } from '../interfaces';

type CommandExecution = (...args: unknown[]) => Promise<ICommandResult> | ICommandResult;

/**
 * Adds a correlation id to command results for easier audit tracing.
 * @param commandName - Name of the command being audited.
 * @returns A correlation id composed from the command name, timestamp, and random suffix.
 */
function createRunId(commandName: string): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${commandName}-${Date.now()}-${randomPart}`;
}

/**
 * Decorates a command handler to append an audit correlation id to the result message.
 * @param commandName - Name of the command being audited.
 * @returns A method decorator that appends audit metadata to successful or failed command results.
 */
export function WithCommandAudit(commandName: string): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as CommandExecution;

    descriptor.value = async function (...args: unknown[]): Promise<ICommandResult> {
      const runId = createRunId(commandName);
      const result = await Promise.resolve(originalMethod.apply(this, args));
      const auditSuffix = `run=${runId}`;

      return {
        ...result,
        message: result.message ? `${result.message} [${auditSuffix}]` : `[${auditSuffix}]`
      };
    };

    return descriptor;
  };
}
