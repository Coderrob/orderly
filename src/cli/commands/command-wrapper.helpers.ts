import {
  createAutoConfigContextResolver,
  normalizeAutoConfigContext,
  type IAutoConfigContext,
  type IAutoConfigOptions,
  type IConfigDiscoveryCapable
} from '../decorators/auto-config-discovery.decorator';
import { createAuditCommandWrapper } from '../decorators/command-audit.decorator';
import type { ICommandExecutionRef } from '../decorators/command-decorator.helpers';
import { createErrorHandledCommandWrapper } from '../decorators/command-error-handler.decorator';
import { createTelemetryCommandWrapper } from '../decorators/command-telemetry.decorator';
import type { ICommandResult } from '../interfaces';

const DIRECTORY_ARGUMENT_INDEX = 0;
const OPTIONS_ARGUMENT_INDEX = 1;
const CONTEXT_ARGUMENT_INDEX = 2;

interface IAutoConfigCommandWrapperConfig<TOptions extends IAutoConfigOptions> {
  readonly auditCommandName?: string;
  readonly commandName: string;
  readonly errorPrefix: string;
  readonly executeCore: (
    directory: string,
    options: Readonly<TOptions>,
    context?: Readonly<IAutoConfigContext<TOptions>>
  ) => Promise<ICommandResult>;
  readonly normalizeDirectory: (value: unknown) => string;
  readonly normalizeOptions: (value: unknown) => Readonly<TOptions>;
  readonly service: Readonly<IConfigDiscoveryCapable>;
}

/**
 * Creates the execution reference used by auto-config directory commands.
 * @param config - Auto-config command wrapper configuration.
 * @returns Command execution reference.
 */
function createAutoConfigExecutionRef<TOptions extends IAutoConfigOptions>(
  config: Readonly<IAutoConfigCommandWrapperConfig<TOptions>>
): Readonly<ICommandExecutionRef> {
  return createDirectoryOptionsCommandExecutionRef({
    executeCore: config.executeCore,
    normalizeContext: normalizeAutoConfigContext<TOptions>,
    normalizeDirectory: config.normalizeDirectory,
    normalizeOptions: config.normalizeOptions,
    resolveContext: createAutoConfigContextResolver<TOptions>(config.service)
  });
}

/**
 * Creates a command execution reference for commands that accept a directory and options object.
 * @param config - Directory-options command adapter configuration.
 * @returns Command execution reference.
 */
export function createDirectoryOptionsCommandExecutionRef<TOptions, TContext>(
  config: Readonly<{
    executeCore: (
      directory: string,
      options: Readonly<TOptions>,
      context?: Readonly<TContext>
    ) => Promise<ICommandResult>;
    normalizeContext: (value: unknown) => Readonly<TContext> | undefined;
    normalizeDirectory: (value: unknown) => string;
    normalizeOptions: (value: unknown) => Readonly<TOptions>;
    resolveContext?: (
      directory: string,
      options: Readonly<TOptions>,
      context: Readonly<TContext> | undefined
    ) => Readonly<TContext> | undefined;
  }>
): Readonly<ICommandExecutionRef> {
  /**
   * Adapts directory-options command execution to the generic command signature.
   * @param this - Invocation context.
   * @param args - Command arguments.
   * @returns Command result.
   */
  function invoke(this: object, ...args: readonly unknown[]): Promise<ICommandResult> {
    const directory = config.normalizeDirectory(args[DIRECTORY_ARGUMENT_INDEX]);
    const options = config.normalizeOptions(args[OPTIONS_ARGUMENT_INDEX]);
    const context = resolveDirectoryOptionsContext(config, directory, options, args);
    return config.executeCore(directory, options, context);
  }

  return { invoke };
}

/**
 * Creates a command execution reference for commands that accept one options object.
 * @param config - Single-options command adapter configuration.
 * @returns Command execution reference.
 */
export function createSingleOptionsCommandExecutionRef<TOptions>(
  config: Readonly<{
    executeCore: (options: Readonly<TOptions>) => Promise<ICommandResult>;
    normalizeOptions: (value: unknown) => Readonly<TOptions>;
  }>
): Readonly<ICommandExecutionRef> {
  /**
   * Adapts one options object to the generic command execution signature.
   * @param this - Invocation context.
   * @param args - Command arguments.
   * @returns Command result.
   */
  function invoke(this: object, ...args: readonly unknown[]): Promise<ICommandResult> {
    return config.executeCore(config.normalizeOptions(args[0]));
  }

  return { invoke };
}

/**
 * Creates a wrapped execute function for directory-based commands that support auto-config context.
 * @param config - Wrapper configuration for the command.
 * @returns Wrapped execute function.
 */
export function createWrappedAutoConfigCommand<TOptions extends IAutoConfigOptions>(
  config: Readonly<IAutoConfigCommandWrapperConfig<TOptions>>
): (
  directory: string,
  options: Readonly<TOptions>,
  context?: Readonly<IAutoConfigContext<TOptions>>
) => Promise<ICommandResult> {
  return createWrappedCommand<
    [string, Readonly<TOptions>, Readonly<IAutoConfigContext<TOptions>>?]
  >({
    auditCommandName: config.auditCommandName,
    commandName: config.commandName,
    errorPrefix: config.errorPrefix,
    executeCoreRef: createAutoConfigExecutionRef(config)
  });
}

/**
 * Creates a wrapped execute function for command handlers.
 * @param config - Wrapper configuration for the command.
 * @returns Wrapped execute function.
 */
export function createWrappedCommand<TArguments extends readonly unknown[]>(
  config: Readonly<{
    auditCommandName?: string;
    commandName: string;
    errorPrefix: string;
    executeCoreRef: Readonly<ICommandExecutionRef>;
  }>
): (...args: TArguments) => Promise<ICommandResult> {
  const errorHandledRef = createErrorHandledCommandWrapper(config.errorPrefix)(
    config.executeCoreRef
  );
  const telemetryRef = createTelemetryCommandWrapper(config.commandName)({
    invoke: errorHandledRef
  });
  const wrappedExecuteRef = config.auditCommandName
    ? createAuditCommandWrapper(config.auditCommandName)({ invoke: telemetryRef })
    : telemetryRef;

  /**
   * Executes the command through the composed wrappers.
   * @param args - Command arguments.
   * @returns Wrapped command result.
   */
  async function execute(...args: Readonly<TArguments>): Promise<ICommandResult> {
    return wrappedExecuteRef.call({}, ...args);
  }

  return execute;
}

/**
 * Creates a wrapped execute function for commands that accept one options object.
 * @param config - Wrapper configuration for the command.
 * @returns Wrapped execute function.
 */
export function createWrappedSingleOptionsCommand<TOptions>(
  config: Readonly<{
    auditCommandName?: string;
    commandName: string;
    errorPrefix: string;
    executeCoreRef: Readonly<ICommandExecutionRef>;
  }>
): (options: Readonly<TOptions>) => Promise<ICommandResult> {
  return createWrappedCommand<[Readonly<TOptions>]>(config);
}

/**
 * Resolves the effective context for a directory-options command invocation.
 * @param config - Directory-options command adapter configuration.
 * @param directory - Normalized directory argument.
 * @param options - Normalized options argument.
 * @param args - Raw command arguments.
 * @returns Effective command context.
 */
function resolveDirectoryOptionsContext<TOptions, TContext>(
  config: Readonly<{
    normalizeContext: (value: unknown) => Readonly<TContext> | undefined;
    resolveContext?: (
      directory: string,
      options: Readonly<TOptions>,
      context: Readonly<TContext> | undefined
    ) => Readonly<TContext> | undefined;
  }>,
  directory: string,
  options: Readonly<TOptions>,
  args: readonly unknown[]
): Readonly<TContext> | undefined {
  const providedContext = config.normalizeContext(args[CONTEXT_ARGUMENT_INDEX]);
  return config.resolveContext
    ? config.resolveContext(directory, options, providedContext)
    : providedContext;
}
