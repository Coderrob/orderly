interface ICliAutoConfigOptions {
  config?: string;
  autoConfig?: boolean;
}

interface ICliAutoConfigCapable {
  findConfigInDirectory(directory: string): string | null;
}

/**
 * Decorates CliService command handlers with target-directory config auto-discovery.
 * @returns A method decorator that injects any auto-discovered config path into the handler call.
 */
export function WithCliAutoConfigDiscovery<
  TOptions extends ICliAutoConfigOptions
>(): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as (
      directory: string,
      options: TOptions,
      autoDiscoveredConfig?: string
    ) => unknown;

    descriptor.value = function (directory: string, options: TOptions): unknown {
      const service = this as ICliAutoConfigCapable;
      const configOptions = { ...options };
      let autoDiscoveredConfig: string | undefined;

      if (!configOptions.config && options.autoConfig) {
        const discoveredConfig = service.findConfigInDirectory(directory);
        if (discoveredConfig) {
          configOptions.config = discoveredConfig;
          autoDiscoveredConfig = discoveredConfig;
        }
      }

      return originalMethod.call(this, directory, configOptions, autoDiscoveredConfig);
    };

    return descriptor;
  };
}
