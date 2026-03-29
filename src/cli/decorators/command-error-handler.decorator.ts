import { ExitCode } from '../constants';
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
 * Builds a standardized failed command result.
 * @param errorPrefix - Message prefix for command failures.
 * @param error - Error value thrown by command execution.
 * @returns Failure command result.
 */
function buildFailureResult(errorPrefix: string, error: unknown): ICommandResult {
  return {
    success: false,
    exitCode: ExitCode.ERROR,
    message: `${errorPrefix}${error instanceof Error ? error.message : String(error)}`
  };
}

/**
 * Creates a plain command wrapper that applies command error handling.
 * @param errorPrefix - Message prefix used for command failures.
 * @returns Command wrapper factory.
 */
export function createErrorHandledCommandWrapper(
  errorPrefix: string
): (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution {
  return createCommandMiddlewareWrapper(
    { value: errorPrefix },
    { invoke: runErrorHandledCommand }
  );
}

/**
 * Creates a method decorator that applies command error handling.
 * @param errorPrefix - Message prefix used for command failures.
 * @returns Decorator implementation.
 */
export function HandleCommandErrors(errorPrefix: string): MethodDecorator {
  return createCommandMiddlewareDecorator(
    { value: errorPrefix },
    { invoke: runErrorHandledCommand }
  );
}

/**
 * Executes a command and maps thrown errors to a failed result payload.
 * @param errorPrefix - Message prefix for command failures.
 * @param originalMethodRef - Original command method reference.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Successful or failed command result.
 */
async function runErrorHandledCommand(
  errorPrefix: string,
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
): Promise<ICommandResult> {
  try {
    const maybeResult = await invokeCommand(originalMethodRef, context, args);
    return isCommandResult(maybeResult)
      ? maybeResult
      : buildFailureResult(errorPrefix, 'Command returned an invalid result payload');
  } catch (error) {
    return buildFailureResult(errorPrefix, error);
  }
}
