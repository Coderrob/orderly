import {
  createWrappedMethodDecorator,
  invokeMethod,
  type IMethodExecutionRef
} from './method-decorator.helpers';

export interface IConfigDiscoveryCapable {
  readonly configService: {
    findConfigInDirectory(directory: string): string | null;
  };
  readonly directoryValidator: {
    validate(directory: string): string;
  };
}

export interface IAutoConfigOptions {
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

type IAutoConfigMethodRef<TOptions extends IAutoConfigOptions> = IMethodExecutionRef<
  AutoConfigMethod<TOptions>
>;

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
 * Creates auto-config context for a command invocation.
 * @param service - Auto-config capable command dependencies.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Auto-config context.
 */
export function createAutoConfigContext<TOptions extends IAutoConfigOptions>(
  service: Readonly<IConfigDiscoveryCapable>,
  directory: string,
  options: Readonly<TOptions>
): Readonly<IAutoConfigContext<TOptions>> {
  return buildAutoConfigContext(service, directory, options);
}

/**
 * Creates a resolver for plain command wrappers that support auto-config discovery.
 * @param service - Auto-config capable command dependencies.
 * @returns Context resolver for directory-options command wrappers.
 */
export function createAutoConfigContextResolver<TOptions extends IAutoConfigOptions>(
  service: Readonly<IConfigDiscoveryCapable>
): (
  directory: string,
  options: Readonly<TOptions>,
  context: Readonly<IAutoConfigContext<TOptions>> | undefined
) => Readonly<IAutoConfigContext<TOptions>> {
  /**
   * Resolves the effective auto-config context for one plain wrapper invocation.
   * @param directory - Command directory argument.
   * @param options - Command options.
   * @param context - Optional pre-resolved auto-config context.
   * @returns Effective auto-config context.
   */
  function resolveContext(
    directory: string,
    options: Readonly<TOptions>,
    context: Readonly<IAutoConfigContext<TOptions>> | undefined
  ): Readonly<IAutoConfigContext<TOptions>> {
    return resolveAutoConfigContext(service, directory, options, context);
  }

  return resolveContext;
}

/**
 * Creates an auto-config wrapper factory.
 * @param _value - Unused configuration placeholder for shared wrapper helpers.
 * @returns Method wrapper factory.
 */
function createAutoConfigWrapperFactory<TOptions extends IAutoConfigOptions>(
  _value: undefined
): (originalMethodRef: Readonly<IAutoConfigMethodRef<TOptions>>) => AutoConfigMethod<TOptions> {
  return wrapAutoConfigMethod;
}

/**
 * Creates a wrapper function that injects auto-discovery context.
 * @param service - Auto-config capable command instance.
 * @param options - Command options.
 * @param targetDir - Resolved target directory.
 * @returns Config override options and discovered config path.
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
 * Returns whether an unknown value looks like auto-config context.
 * @param value - Candidate context value.
 * @returns True when the value matches auto-config context.
 */
function isAutoConfigContext<TOptions extends IAutoConfigOptions>(
  value: unknown
): value is Readonly<IAutoConfigContext<TOptions>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'configOptions' in value &&
    'targetDir' in value &&
    typeof Reflect.get(value, 'targetDir') === 'string'
  );
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
 * Checks whether a descriptor value matches the auto-config method signature.
 * @param value - Descriptor value.
 * @returns True when the value is a compatible method.
 */
function isAutoConfigMethod<TOptions extends IAutoConfigOptions>(
  value: unknown
): value is AutoConfigMethod<TOptions> {
  return typeof value === 'function';
}

/**
 * Checks whether an unknown value supports config discovery behavior.
 * @param value - Value to check.
 * @returns True when value is config-discovery capable.
 */
function isConfigDiscoveryCapable(value: unknown): value is IConfigDiscoveryCapable {
  if (!value || typeof value !== 'object') return false;
  return 'configService' in value && 'directoryValidator' in value;
}

/**
 * Normalizes an unknown value to auto-config context.
 * @param value - Candidate context value.
 * @returns Auto-config context when present.
 */
export function normalizeAutoConfigContext<TOptions extends IAutoConfigOptions>(
  value: unknown
): Readonly<IAutoConfigContext<TOptions>> | undefined {
  return isAutoConfigContext<TOptions>(value) ? value : undefined;
}

/**
 * Resolves the effective auto-config context for a command invocation.
 * @param service - Auto-config capable command dependencies.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @param context - Optional pre-resolved auto-config context.
 * @returns Effective auto-config context.
 */
export function resolveAutoConfigContext<TOptions extends IAutoConfigOptions>(
  service: Readonly<IConfigDiscoveryCapable>,
  directory: string,
  options: Readonly<TOptions>,
  context?: Readonly<IAutoConfigContext<TOptions>>
): Readonly<IAutoConfigContext<TOptions>> {
  return context ?? createAutoConfigContext(service, directory, options);
}

/**
 * Resolves optional auto-config context from invocation state.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Auto-config context when discovery is available.
 */
function resolveMethodAutoConfigContext<TOptions extends IAutoConfigOptions>(
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): Readonly<IAutoConfigContext<TOptions>> | undefined {
  return isConfigDiscoveryCapable(context)
    ? buildAutoConfigContext(context, directory, options)
    : undefined;
}

/**
 * Executes wrapped auto-config method with resolved context.
 * @param methodRef - Decorated method to invoke.
 * @param context - Invocation context.
 * @param directory - Command directory argument.
 * @param options - Command options.
 * @returns Original method return value.
 */
function runAutoConfigMethod<TOptions extends IAutoConfigOptions>(
  methodRef: Readonly<IAutoConfigMethodRef<TOptions>>,
  context: unknown,
  directory: string,
  options: Readonly<TOptions>
): unknown {
  const autoConfigContext = resolveMethodAutoConfigContext(context, directory, options);
  return invokeMethod(methodRef, context, [directory, options, autoConfigContext]);
}

/**
 * Decorates command execute methods with shared auto-config discovery behavior.
 * @returns A method decorator that resolves target-directory config files before execution.
 */
export function WithAutoConfigDiscovery<TOptions extends IAutoConfigOptions>(): MethodDecorator {
  return createWrappedMethodDecorator(
    { value: undefined },
    isAutoConfigMethod<TOptions>,
    createAutoConfigWrapperFactory<TOptions>
  );
}

/**
 * Wraps an auto-config method reference with discovery behavior.
 * @param originalMethodRef - Original method reference.
 * @returns Wrapped method execution.
 */
function wrapAutoConfigMethod<TOptions extends IAutoConfigOptions>(
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
    return runAutoConfigMethod(originalMethodRef, this, directory, options);
  }

  return executeWithAutoConfig;
}
