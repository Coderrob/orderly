import {
  createWrappedMethodDecorator,
  invokeMethod,
  type IMethodExecutionRef
} from './method-decorator.helpers';

interface ICliAutoConfigOptions {
  readonly config?: string;
  readonly autoConfig?: boolean;
}

interface ICliAutoConfigCapable {
  findConfigInDirectory(directory: string): string | null;
}

type CliAutoConfigMethod<TOptions extends ICliAutoConfigOptions> = (
  this: unknown,
  directory: string,
  options: Readonly<TOptions>,
  autoDiscoveredConfig?: string
) => unknown;

type ICliAutoConfigMethodRef<TOptions extends ICliAutoConfigOptions> = IMethodExecutionRef<
  CliAutoConfigMethod<TOptions>
>;

/**
 * Creates a CLI auto-config wrapper factory.
 * @param _value - Unused configuration placeholder for shared wrapper helpers.
 * @returns Method wrapper factory.
 */
function createCliAutoConfigWrapperFactory<TOptions extends ICliAutoConfigOptions>(
  _value: undefined
): (
  originalMethodRef: Readonly<ICliAutoConfigMethodRef<TOptions>>
) => CliAutoConfigMethod<TOptions> {
  return wrapCliAutoConfigMethod;
}

/**
 * Creates a wrapper function that injects auto-discovered config path.
 * @param service - CLI service with config discovery capability.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Discovered config and merged options.
 */
function discoverCliConfigOption<TOptions extends ICliAutoConfigOptions>(
  service: Readonly<ICliAutoConfigCapable>,
  directory: string,
  options: Readonly<TOptions>
): Readonly<{ autoDiscoveredConfig?: string; configOptions: TOptions }> {
  if (options.config || isCliAutoConfigDisabled(options)) return { configOptions: { ...options } };

  const discoveredConfig = service.findConfigInDirectory(directory);
  return discoveredConfig
    ? {
        autoDiscoveredConfig: discoveredConfig,
        configOptions: { ...options, config: discoveredConfig }
      }
    : { configOptions: { ...options } };
}

/**
 * Checks whether an unknown value supports CLI config discovery behavior.
 * @param value - Value to check.
 * @returns True when value can discover config files.
 */
function isCliAutoConfigCapable(value: unknown): value is ICliAutoConfigCapable {
  return !!value && typeof value === 'object' && 'findConfigInDirectory' in value;
}

/**
 * Returns whether CLI auto-config is explicitly disabled.
 * @param options - Command options.
 * @returns True when auto-config was disabled by the caller.
 */
function isCliAutoConfigDisabled<TOptions extends ICliAutoConfigOptions>(
  options: Readonly<TOptions>
): boolean {
  return Object.is(options.autoConfig, false);
}

/**
 * Checks whether a descriptor value matches the CLI auto-config method signature.
 * @param value - Descriptor value.
 * @returns True when the value is a compatible method.
 */
function isCliAutoConfigMethod<TOptions extends ICliAutoConfigOptions>(
  value: unknown
): value is CliAutoConfigMethod<TOptions> {
  return typeof value === 'function';
}

/**
 * Resolves CLI config discovery output for a handler invocation.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Discovered config and effective config options.
 */
function resolveCliDiscovery<TOptions extends ICliAutoConfigOptions>(
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): Readonly<{ autoDiscoveredConfig?: string; configOptions: TOptions }> {
  return isCliAutoConfigCapable(context)
    ? discoverCliConfigOption(context, directory, options)
    : { autoDiscoveredConfig: undefined, configOptions: { ...options } };
}

/**
 * Executes wrapped CLI auto-config method with discovered config handling.
 * @param methodRef - Decorated method to invoke.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Original method return value.
 */
function runCliAutoConfigMethod<TOptions extends ICliAutoConfigOptions>(
  methodRef: Readonly<ICliAutoConfigMethodRef<TOptions>>,
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): unknown {
  const discovery = resolveCliDiscovery(context, directory, options);
  return invokeMethod(methodRef, context, [
    directory,
    discovery.configOptions,
    discovery.autoDiscoveredConfig
  ]);
}

/**
 * Decorates CLI command handlers with target-directory config auto-discovery.
 * @returns A method decorator that injects any auto-discovered config path into the handler call.
 */
export function WithCliAutoConfigDiscovery<
  TOptions extends ICliAutoConfigOptions
>(): MethodDecorator {
  return createWrappedMethodDecorator(
    { value: undefined },
    isCliAutoConfigMethod<TOptions>,
    createCliAutoConfigWrapperFactory<TOptions>
  );
}

/**
 * Wraps a CLI auto-config method reference with discovery behavior.
 * @param originalMethodRef - Original method reference.
 * @returns Wrapped method execution.
 */
function wrapCliAutoConfigMethod<TOptions extends ICliAutoConfigOptions>(
  originalMethodRef: Readonly<ICliAutoConfigMethodRef<TOptions>>
): CliAutoConfigMethod<TOptions> {
  /**
   * Executes command method with injected discovered config path.
   * @param this - Invocation context.
   * @param directory - Command directory argument.
   * @param options - Command options.
   * @returns Original method return value.
   */
  function executeWithCliAutoConfig(
    this: unknown,
    directory: string,
    options: Readonly<TOptions>
  ): unknown {
    return runCliAutoConfigMethod(originalMethodRef, this, directory, options);
  }

  return executeWithCliAutoConfig;
}
