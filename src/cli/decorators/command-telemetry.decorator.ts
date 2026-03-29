import { Clock } from '../../utils/clock';
import type { ICommandResult } from '../interfaces';

import {
  createCommandMiddlewareDecorator,
  createCommandMiddlewareWrapper,
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
 * Creates a plain command wrapper that appends telemetry metadata.
 * @param commandName - Name of the command being measured.
 * @returns Command wrapper factory.
 */
export function createTelemetryCommandWrapper(
  commandName: string
): (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution {
  return createCommandMiddlewareWrapper(
    { value: commandName },
    { invoke: runTelemetryCommand }
  );
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
 * Adds lightweight timing telemetry to command handler results.
 * @param commandName - Name of the command being measured.
 * @returns A method decorator that appends duration metadata to the command result message.
 */
export function WithCommandTelemetry(commandName: string): MethodDecorator {
  return createCommandMiddlewareDecorator(
    { value: commandName },
    { invoke: runTelemetryCommand }
  );
}
