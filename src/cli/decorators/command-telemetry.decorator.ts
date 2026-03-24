import { Clock } from '../../utils/clock';
import type { ICommandResult } from '../interfaces';

type CommandExecution = (
  this: object,
  ...args: readonly unknown[]
) => Promise<ICommandResult> | ICommandResult;

interface ICommandExecutionRef {
  readonly invoke: CommandExecution;
}

/**
 * Appends telemetry metadata to a command result message.
 * @param result - Original command result.
 * @param commandName - Command name used in telemetry text.
 * @param durationMs - Measured command execution time.
 * @returns Command result with appended telemetry metadata.
 */
function appendTelemetryMessage(
  result: Readonly<ICommandResult>,
  commandName: string,
  durationMs: number
): ICommandResult {
  const telemetrySuffix = `${commandName} completed in ${durationMs}ms`;
  return {
    ...result,
    message: result.message ? `${result.message} (${telemetrySuffix})` : telemetrySuffix
  };
}

/**
 * Creates the method-decorator function that applies telemetry wrapping.
 * @param commandName - Command name used in telemetry text.
 * @returns Method decorator implementation.
 */
function createTelemetryMethodDecorator(commandName: string): MethodDecorator {
  /**
   * Applies telemetry wrapping to a command descriptor.
   * @param _target - Decorated class prototype.
   * @param _propertyKey - Decorated method key.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor with telemetry behavior.
   */
  function applyCommandTelemetry(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: Readonly<PropertyDescriptor>
  ): PropertyDescriptor {
    return telemetryDescriptorFrom(commandName, descriptor);
  }
  return applyCommandTelemetry;
}

/**
 * Wraps a command method with telemetry timing behavior.
 * @param commandName - Command name used in telemetry text.
 * @param originalMethod - Command method to wrap.
 * @returns Telemetry-enabled command method.
 */
function createTelemetryWrapper(
  commandName: string,
  originalMethodRef: Readonly<ICommandExecutionRef>
): CommandExecution {
  /**
   * Executes the wrapped command and appends telemetry metadata.
   * @param this - Invocation context.
   * @param args - Command arguments.
   * @returns Command result with telemetry suffix.
   */
  async function executeWithTelemetry(
    this: object,
    ...args: readonly unknown[]
  ): Promise<ICommandResult> {
    return runTelemetryCommand(commandName, originalMethodRef, this, args);
  }
  return executeWithTelemetry;
}

/**
 * Executes a command and appends telemetry timing metadata.
 * @param commandName - Command name used in telemetry text.
 * @param originalMethod - Command method to wrap.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Command result with telemetry metadata.
 */
function isCommandExecution(value: unknown): value is CommandExecution {
  return typeof value === 'function';
}

/**
 * Checks whether a descriptor value can be wrapped as a command method.
 * @param value - Descriptor value.
 * @returns True when the value is a callable command method.
 */
function isCommandResult(value: unknown): value is ICommandResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'exitCode' in value &&
    'message' in value
  );
}

/**
 * Checks whether an unknown value matches ICommandResult.
 * @param commandName - Command name used in telemetry text.
 * @param originalMethodRef - Command method reference to execute.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Command result with telemetry metadata.
 */
async function runTelemetryCommand(
  commandName: string,
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
): Promise<ICommandResult> {
  const startedAtMs = Clock.nowMonotonicMs();
  const maybeResult: unknown = await Promise.resolve(
    Function.prototype.apply.call(originalMethodRef.invoke, context, args)
  );
  const durationMs = Math.max(0, Math.round(Clock.nowMonotonicMs() - startedAtMs));
  return isCommandResult(maybeResult)
    ? appendTelemetryMessage(maybeResult, commandName, durationMs)
    : appendTelemetryMessage({ success: false, exitCode: 1, message: '' }, commandName, durationMs);
}

/**
 * Builds a telemetry-enabled descriptor from an existing method descriptor.
 * @param commandName - Command name used in telemetry text.
 * @param descriptor - Original method descriptor.
 * @returns Updated descriptor with telemetry wrapper.
 */
function telemetryDescriptorFrom(
  commandName: string,
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isCommandExecution(originalMethod)) {
    return { ...descriptor };
  }

  return {
    ...descriptor,
    value: createTelemetryWrapper(commandName, { invoke: originalMethod })
  };
}

/**
 * Adds lightweight timing telemetry to command handler results.
 * @param commandName - Name of the command being measured.
 * @returns A method decorator that appends duration metadata to the command result message.
 */
export function WithCommandTelemetry(commandName: string): MethodDecorator {
  return createTelemetryMethodDecorator(commandName);
}
