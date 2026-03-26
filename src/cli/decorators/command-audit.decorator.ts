import * as crypto from 'node:crypto';

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
  return createWrappedDescriptor(descriptor, createAuditWrapperFactory(commandName));
}

/**
 * Creates a descriptor wrapper factory for one command name.
 * @param commandName - Name of the command being audited.
 * @returns Descriptor wrapper factory.
 */
function createAuditDescriptorFactory(
  commandName: string
): (descriptor: Readonly<PropertyDescriptor>) => PropertyDescriptor {
  /**
   * Wraps one descriptor with audit behavior.
   * @param descriptor - Original method descriptor.
   * @returns Updated descriptor.
   */
  function wrapAuditDescriptor(descriptor: Readonly<PropertyDescriptor>): PropertyDescriptor {
    return createAuditDescriptor(commandName, descriptor);
  }

  return wrapAuditDescriptor;
}

/**
 * Wraps a command method with audit metadata behavior.
 * @param commandName - Name of the command being audited.
 * @param originalMethodRef - Original command method reference.
 * @returns Command method with audit metadata appended.
 */
function createAuditedWrapper(
  commandName: string,
  originalMethodRef: Readonly<ICommandExecutionRef>
): CommandExecution {
  /**
   * Executes the wrapped command and appends audit metadata.
   * @param this - Invocation context.
   * @param args - Command arguments.
   * @returns Command result with audit suffix.
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
 * Creates a method decorator that applies audit metadata behavior.
 * @param commandName - Name of the command being audited.
 * @returns Method decorator implementation.
 */
function createAuditMethodDecorator(commandName: string): MethodDecorator {
  return createCommandMethodDecorator(createAuditDescriptorFactory(commandName));
}

/**
 * Creates a command wrapper factory for one audited command.
 * @param commandName - Name of the command being audited.
 * @returns Command wrapper factory.
 */
function createAuditWrapperFactory(
  commandName: string
): (originalMethodRef: Readonly<ICommandExecutionRef>) => CommandExecution {
  /**
   * Wraps the original command method.
   * @param originalMethodRef - Original command method reference.
   * @returns Wrapped command execution.
   */
  function wrapAuditMethod(originalMethodRef: Readonly<ICommandExecutionRef>): CommandExecution {
    return createAuditedWrapper(commandName, originalMethodRef);
  }

  return wrapAuditMethod;
}

/**
 * Creates a short random token for audit run ids.
 * @returns Random token suffix.
 */
function createRandomToken(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, RANDOM_TOKEN_LENGTH);
}

/**
 * Creates a correlation id for a command invocation.
 * @param commandName - Name of the command being audited.
 * @returns Correlation id composed from command name, monotonic token, and random suffix.
 */
function createRunId(commandName: string): string {
  const randomPart = createRandomToken();
  const token = Clock.nowMonotonicToken();
  return `${commandName}-${token}-${randomPart}`;
}

/**
 * Executes the original command and appends audit metadata.
 * @param commandName - Name of the command being audited.
 * @param originalMethodRef - Original command method reference.
 * @param context - Invocation context.
 * @param args - Command arguments.
 * @returns Command result with audit metadata.
 */
async function runAuditedCommand(
  commandName: string,
  originalMethodRef: Readonly<ICommandExecutionRef>,
  context: object,
  args: readonly unknown[]
): Promise<ICommandResult> {
  const runId = createRunId(commandName);
  const maybeResult = await invokeCommand(originalMethodRef, context, args);
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
