import * as crypto from 'node:crypto';

import { Clock } from '../../utils/clock';
import type { ICommandResult } from '../interfaces';

type CommandExecution = (
  this: object,
  ...args: readonly unknown[]
) => Promise<ICommandResult> | ICommandResult;

interface ICommandExecutionRef {
  readonly invoke: CommandExecution;
}

const RANDOM_TOKEN_LENGTH = 8;

/**
 * Appends audit metadata to a command result.
 * @param result - Original command result.
 * @param runId - Correlation id for the command execution.
 * @returns Command result with appended audit metadata.
 */
function appendAuditMetadata(result: Readonly<ICommandResult>, runId: string): ICommandResult {
  const auditSuffix = `run=${runId}`;
  return {
    ...result,
    message: result.message ? `${result.message} [${auditSuffix}]` : `[${auditSuffix}]`
  };
}

/**
 * Produces a descriptor whose value includes audit behavior.
 * @param commandName - Name of the command being audited.
 * @param descriptor - Original method descriptor.
 * @returns Updated descriptor with audit wrapper.
 */
function createAuditDescriptor(
  commandName: string,
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isCommandExecution(originalMethod)) {
    return { ...descriptor };
  }

  return {
    ...descriptor,
    value: createAuditedWrapper(commandName, { invoke: originalMethod })
  };
}

/**
 * Wraps a command method with audit metadata behavior.
 * @param commandName - Name of the command being audited.
 * @param originalMethod - Original command method.
 * @returns Command method with audit metadata appended.
 */
function createAuditedWrapper(
  commandName: string,
  originalMethodRef: Readonly<ICommandExecutionRef>
): CommandExecution {
  /**
   * executeWithAudit TODO: describe
   * @param this TODO: describe parameter
   * @param args TODO: describe parameter
   * @returns TODO: describe return value
   */
  async function executeWithAudit(
    this: object,
    ...args: readonly unknown[]
  ): Promise<ICommandResult> {
    return runAuditedCommand(commandName, originalMethodRef, this, args);
  }
  return executeWithAudit;
}

/**
 * Executes a command and appends audit correlation metadata.
 * @param commandName - Name of the command being audited.
 * @param originalMethod - Original command method.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Command result with audit metadata.
 */
function createAuditMethodDecorator(commandName: string): MethodDecorator {
  /**
   * Applies audit behavior wrapping to the decorated method.
   * @param _target - Decorated class prototype.
   * @param _propertyKey - Decorated method key.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor with audit behavior.
   */
  function applyCommandAudit(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: Readonly<PropertyDescriptor>
  ): PropertyDescriptor {
    return createAuditDescriptor(commandName, descriptor);
  }
  return applyCommandAudit;
}

/**
 * Creates a method decorator that applies audit metadata behavior.
 * @param commandName - Name of the command being audited.
 * @returns Method decorator implementation.
 * @param originalMethod TODO: describe parameter
 * @param context TODO: describe parameter
 * @param args TODO: describe parameter
 */
function createRandomToken(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, RANDOM_TOKEN_LENGTH);
}

/**
 * Creates a short random token for audit run ids.
 * @returns Random token suffix.
 * @param commandName TODO: describe parameter
 * @param originalMethod TODO: describe parameter
 * @param context TODO: describe parameter
 * @param args TODO: describe parameter
 */
function createRunId(commandName: string): string {
  const randomPart = createRandomToken();
  const token = Clock.nowMonotonicToken();
  return `${commandName}-${token}-${randomPart}`;
}

/**
 * Adds a correlation id to command results for easier audit tracing.
 * @param commandName - Name of the command being audited.
 * @returns A correlation id composed from the command name, timestamp token, and random suffix.
 * @param originalMethod TODO: describe parameter
 * @param context TODO: describe parameter
 * @param args TODO: describe parameter
 */
function isCommandExecution(value: unknown): value is CommandExecution {
  return typeof value === 'function';
}

/**
 * Checks whether a descriptor value can be wrapped as a command method.
 * @param value - Descriptor value.
 * @returns True when the value is a callable command method.
 * @param originalMethod TODO: describe parameter
 * @param context TODO: describe parameter
 * @param args TODO: describe parameter
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
 * @param value - Value to check.
 * @returns True when value matches ICommandResult shape.
 * @param originalMethod TODO: describe parameter
 * @param context TODO: describe parameter
 * @param args TODO: describe parameter
 */
async function runAuditedCommand(
  commandName: string,
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
): Promise<ICommandResult> {
  const runId = createRunId(commandName);
  const maybeResult: unknown = await Promise.resolve(
    Function.prototype.apply.call(originalMethodRef.invoke, context, args)
  );
  return isCommandResult(maybeResult)
    ? appendAuditMetadata(maybeResult, runId)
    : appendAuditMetadata({ success: false, exitCode: 1, message: '' }, runId);
}

/**
 * Decorates a command handler to append an audit correlation id to the result message.
 * @param commandName - Name of the command being audited.
 * @returns A method decorator that appends audit metadata to successful or failed command results.
 */
export function WithCommandAudit(commandName: string): MethodDecorator {
  return createAuditMethodDecorator(commandName);
}
