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

interface ICliAutoConfigMethodRef<TOptions extends ICliAutoConfigOptions> {
  readonly invoke: CliAutoConfigMethod<TOptions>;
}

/**
 * Creates a wrapper descriptor for CLI auto-config behavior.
 * @param descriptor - Original method descriptor.
 * @returns Updated descriptor with auto-config behavior.
 */
function createCliAutoConfigDescriptor<TOptions extends ICliAutoConfigOptions>(
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isCliAutoConfigMethod<TOptions>(originalMethod)) return { ...descriptor };
  return { ...descriptor, value: createCliAutoConfigWrapper({ invoke: originalMethod }) };
}

/**
 * Applies CLI auto-config behavior to the decorated descriptor.
 * @param _target - Decorated class prototype.
 * @param _propertyKey - Decorated method key.
 * @param descriptor - Original descriptor.
 * @returns Updated descriptor with auto-config behavior.
 */
function createCliAutoConfigWrapper<TOptions extends ICliAutoConfigOptions>(
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
    return executeWrappedCliAutoConfigMethod(originalMethodRef, this, directory, options);
  }

  return executeWithCliAutoConfig;
}

/**
 * Creates a wrapper function that injects auto-discovered config path.
 * @param originalMethod - Original decorated method.
 * @returns Wrapped method.
 * @param _propertyKey TODO: describe parameter
 * @param descriptor TODO: describe parameter
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
 * Executes wrapped CLI auto-config method with discovered config handling.
 * @param method - Decorated method to invoke.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Original method return value.
 */
function executeWrappedCliAutoConfigMethod<TOptions extends ICliAutoConfigOptions>(
  methodRef: Readonly<ICliAutoConfigMethodRef<TOptions>>,
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): unknown {
  const discovery = zResolveCliDiscovery(context, directory, options);
  return invokeCliAutoConfigMethod(methodRef, context, {
    autoDiscoveredConfig: discovery.autoDiscoveredConfig,
    directory,
    options: discovery.configOptions
  });
}

/**
 * Resolves discovered config path and options for CLI handlers.
 * @param service - CLI service with config discovery capability.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Discovered config and merged options.
 * @param options TODO: describe parameter
 */
function invokeCliAutoConfigMethod<TOptions extends ICliAutoConfigOptions>(
  methodRef: Readonly<ICliAutoConfigMethodRef<TOptions>>,
  context: unknown,
  args: Readonly<{
    autoDiscoveredConfig?: string;
    directory: string;
    options: Readonly<TOptions>;
  }>
): unknown {
  return Function.prototype.apply.call(methodRef.invoke, context, [
    args.directory,
    args.options,
    args.autoDiscoveredConfig
  ]);
}

/**
 * Invokes a CLI auto-config method with explicit context and arguments.
 * @param method - Decorated method to invoke.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @param autoDiscoveredConfig - Optional discovered config path.
 * @returns Original method return value.
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
 * Resolves CLI config discovery output for a handler invocation.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Discovered config and effective config options.
 */
function isCliAutoConfigMethod<TOptions extends ICliAutoConfigOptions>(
  value: unknown
): value is CliAutoConfigMethod<TOptions> {
  return typeof value === 'function';
}

/**
 * Checks whether an unknown value supports CLI config discovery behavior.
 * @param value - Value to check.
 * @returns True when value can discover config files.
 * @param directory TODO: describe parameter
 * @param options TODO: describe parameter
 */
export function WithCliAutoConfigDiscovery<
  TOptions extends ICliAutoConfigOptions
>(): MethodDecorator {
  return zWrapCliAutoConfigDescriptor<TOptions>;
}

/**
 * Checks whether a descriptor value matches the CLI auto-config method signature.
 * @param value - Descriptor value.
 * @returns True when the value is a compatible method.
 * @param directory TODO: describe parameter
 * @param options TODO: describe parameter
 */
function zResolveCliDiscovery<TOptions extends ICliAutoConfigOptions>(
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): Readonly<{ autoDiscoveredConfig?: string; configOptions: TOptions }> {
  return isCliAutoConfigCapable(context)
    ? discoverCliConfigOption(context, directory, options)
    : { autoDiscoveredConfig: undefined, configOptions: { ...options } };
}

/**
 * Decorates CliService command handlers with target-directory config auto-discovery.
 * @returns A method decorator that injects any auto-discovered config path into the handler call.
 * @param context TODO: describe parameter
 * @param directory TODO: describe parameter
 * @param options TODO: describe parameter
 */
function zWrapCliAutoConfigDescriptor<TOptions extends ICliAutoConfigOptions>(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  return createCliAutoConfigDescriptor<TOptions>(descriptor);
}
