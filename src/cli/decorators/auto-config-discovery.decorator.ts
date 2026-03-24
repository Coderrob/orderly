interface IConfigDiscoveryCapable {
  readonly configService: {
    findConfigInDirectory(directory: string): string | null;
  };
  readonly directoryValidator: {
    validate(directory: string): string;
  };
}

interface IAutoConfigOptions {
  readonly config?: string;
  readonly autoConfig?: boolean;
}

export interface IAutoConfigContext<TOptions extends IAutoConfigOptions> {
  readonly targetDir: string;
  readonly configOptions: TOptions;
  readonly autoDiscoveredConfig?: string;
}

type AutoConfigMethod<TOptions extends IAutoConfigOptions> = (
  this: unknown,
  directory: string,
  options: Readonly<TOptions>,
  context?: Readonly<IAutoConfigContext<TOptions>>
) => unknown;

interface IAutoConfigMethodRef<TOptions extends IAutoConfigOptions> {
  readonly invoke: AutoConfigMethod<TOptions>;
}

/**
 * Builds an auto-config context for a target directory.
 * @param service - Auto-config capable command instance.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Context passed to decorated execute methods.
 */
function buildAutoConfigContext<TOptions extends IAutoConfigOptions>(
  service: Readonly<IConfigDiscoveryCapable>,
  directory: string,
  options: Readonly<TOptions>
): Readonly<IAutoConfigContext<TOptions>> {
  const targetDir = service.directoryValidator.validate(directory);
  const discovery = discoverConfigOption(service, options, targetDir);
  return {
    targetDir,
    configOptions: discovery.configOptions,
    autoDiscoveredConfig: discovery.autoDiscoveredConfig
  };
}

/**
 * Creates a wrapper descriptor for auto-config behavior.
 * @param descriptor - Original method descriptor.
 * @returns Updated descriptor with auto-config behavior.
 */
function createAutoConfigDescriptor<TOptions extends IAutoConfigOptions>(
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  const originalMethod: unknown = descriptor.value;
  if (!isAutoConfigMethod<TOptions>(originalMethod)) return { ...descriptor };
  return { ...descriptor, value: createAutoConfigWrapper({ invoke: originalMethod }) };
}

/**
 * Applies auto-config behavior to the decorated descriptor.
 * @param _target - Decorated class prototype.
 * @param _propertyKey - Decorated method key.
 * @param descriptor - Original descriptor.
 * @returns Updated descriptor with auto-config behavior.
 */
function createAutoConfigWrapper<TOptions extends IAutoConfigOptions>(
  originalMethodRef: Readonly<IAutoConfigMethodRef<TOptions>>
): AutoConfigMethod<TOptions> {
  /**
   * Executes command method with injected auto-config context.
   * @param this - Invocation context.
   * @param directory - Command directory argument.
   * @param options - Command options.
   * @returns Original method return value.
   */
  function executeWithAutoConfig(
    this: unknown,
    directory: string,
    options: Readonly<TOptions>
  ): unknown {
    return executeWrappedAutoConfigMethod(originalMethodRef, this, directory, options);
  }

  return executeWithAutoConfig;
}

/**
 * Creates a wrapper function that injects auto-discovery context.
 * @param originalMethod - Original decorated method.
 * @returns Wrapped method.
 * @param _propertyKey TODO: describe parameter
 * @param descriptor TODO: describe parameter
 */
function discoverConfigOption<TOptions extends IAutoConfigOptions>(
  service: Readonly<IConfigDiscoveryCapable>,
  options: Readonly<TOptions>,
  targetDir: string
): Readonly<{ autoDiscoveredConfig?: string; configOptions: TOptions }> {
  if (options.config || isAutoConfigDisabled(options)) return { configOptions: { ...options } };

  const targetConfig = service.configService.findConfigInDirectory(targetDir);
  return targetConfig
    ? { autoDiscoveredConfig: targetConfig, configOptions: { ...options, config: targetConfig } }
    : { configOptions: { ...options } };
}

/**
 * Executes wrapped auto-config method with resolved context.
 * @param method - Decorated method to invoke.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Original method return value.
 */
function executeWrappedAutoConfigMethod<TOptions extends IAutoConfigOptions>(
  methodRef: Readonly<IAutoConfigMethodRef<TOptions>>,
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): unknown {
  const autoConfigContext = zResolveAutoConfigContext(context, directory, options);
  return invokeAutoConfigMethod(methodRef, context, { autoConfigContext, directory, options });
}

/**
 * Builds config override options with optional discovered config path.
 * @param service - Auto-config capable command instance.
 * @param options - Command options.
 * @param targetDir - Resolved target directory.
 * @returns Config override options and discovered config path.
 * @param options TODO: describe parameter
 */
function invokeAutoConfigMethod<TOptions extends IAutoConfigOptions>(
  methodRef: Readonly<IAutoConfigMethodRef<TOptions>>,
  context: unknown,
  args: Readonly<{
    autoConfigContext?: Readonly<IAutoConfigContext<TOptions>>;
    directory: string;
    options: Readonly<TOptions>;
  }>
): unknown {
  return Function.prototype.apply.call(methodRef.invoke, context, [
    args.directory,
    args.options,
    args.autoConfigContext
  ]);
}

/**
 * Returns whether auto-config is explicitly disabled.
 * @param options - Command options.
 * @returns True when auto-config was disabled by the caller.
 */
function isAutoConfigDisabled<TOptions extends IAutoConfigOptions>(
  options: Readonly<TOptions>
): boolean {
  return Object.is(options.autoConfig, false);
}

/**
 * Invokes an auto-config method with explicit context and arguments.
 * @param method - Decorated method to invoke.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @param autoConfigContext - Optional auto-config context.
 * @returns Original method return value.
 */
function isAutoConfigMethod<TOptions extends IAutoConfigOptions>(
  value: unknown
): value is AutoConfigMethod<TOptions> {
  return typeof value === 'function';
}

/**
 * Resolves optional auto-config context from invocation state.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Auto-config context when discovery is available.
 */
function isConfigDiscoveryCapable(value: unknown): value is IConfigDiscoveryCapable {
  if (!value || typeof value !== 'object') return false;
  return 'configService' in value && 'directoryValidator' in value;
}

/**
 * Checks whether a descriptor value matches the auto-config method signature.
 * @param value - Descriptor value.
 * @returns True when the value is a compatible method.
 * @param directory TODO: describe parameter
 * @param options TODO: describe parameter
 */
export function WithAutoConfigDiscovery<TOptions extends IAutoConfigOptions>(): MethodDecorator {
  return zWrapAutoConfigDescriptor<TOptions>;
}

/**
 * Checks whether an unknown value supports config discovery behavior.
 * @param value - Value to check.
 * @returns True when value is config-discovery capable.
 * @param directory TODO: describe parameter
 * @param options TODO: describe parameter
 */
function zResolveAutoConfigContext<TOptions extends IAutoConfigOptions>(
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): Readonly<IAutoConfigContext<TOptions>> | undefined {
  return isConfigDiscoveryCapable(context)
    ? buildAutoConfigContext(context, directory, options)
    : undefined;
}

/**
 * Decorates command execute methods with shared auto-config discovery behavior.
 * @returns A method decorator that resolves target-directory config files before execution.
 * @param context TODO: describe parameter
 * @param directory TODO: describe parameter
 * @param options TODO: describe parameter
 */
function zWrapAutoConfigDescriptor<TOptions extends IAutoConfigOptions>(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: Readonly<PropertyDescriptor>
): PropertyDescriptor {
  return createAutoConfigDescriptor<TOptions>(descriptor);
}
