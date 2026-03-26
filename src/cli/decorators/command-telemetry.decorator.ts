import { Clock } from '../../utils/clock';
import type { ICommandResult } from '../interfaces';

import {
  createCommandMethodDecorator,
  createWrappedDescriptor,
  invokeCommand,
  isCommandResult,
  type CommandExecution,
  type ICommandExecutionRef
} from './command-decorator.helpers';

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
 * Creates a descriptor wrapper factory for one telemetry command name.
 * @param commandName - Command name used in telemetry text.
 * @returns Descriptor wrapper factory.
 */
function createTelemetryDescriptorFactory(
  commandName: string
): (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor {
  /**
   * Wraps one descriptor with telemetry behavior.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor.
   */
  function wrapTelemetryDescriptor(descriptor: Readonly<PropertyDescriptor>): PropertyDescriptor {
    return telemetryDescriptorFrom(commandName, descriptor);
  }

  return wrapTelemetryDescriptor;
}

/**
 * Creates the method-decorator function that applies telemetry wrapping.
 * @param commandName - Command name used in telemetry text.
 * @returns Method decorator implementation.
 */
function createTelemetryMethodDecorator(commandName: string): MethodDecorator {
  return createCommandMethodDecorator(createTelemetryDescriptorFactory(commandName));
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
 * Creates a command wrapper factory for one telemetry command.
 * @param commandName - Command name used in telemetry text.
 * @returns Command wrapper factory.
 */
function createTelemetryWrapperFactory(
  commandName: string
): (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution {
  /**
   * Wraps the original command method.
   * @param originalMethodRef - Original command method reference.
   * @returns Wrapped command execution.
   */
  function wrapTelemetryMethod(
    originalMethodRef: Readonly<ICommandExecutionRef>
  ): CommandExecution {
    return createTelemetryWrapper(commandName, originalMethodRef);
  }

  return wrapTelemetryMethod;
}

/**
 * Executes a command and appends telemetry timing metadata.
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
  const maybeResult = await invokeCommand(originalMethodRef, context, args);
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
  return createWrappedDescriptor(descriptor, createTelemetryWrapperFactory(commandName));
}

/**
 * Adds lightweight timing telemetry to command handler results.
 * @param commandName - Name of the command being measured.
 * @returns A method decorator that appends duration metadata to the command result message.
 */
export function WithCommandTelemetry(commandName: string): MethodDecorator {
  return createTelemetryMethodDecorator(commandName);
}
