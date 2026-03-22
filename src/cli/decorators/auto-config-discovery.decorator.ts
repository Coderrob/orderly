interface IConfigDiscoveryCapable {
  configService: {
    findConfigInDirectory(directory: string): string | null;
  };
  directoryValidator: {
    validate(directory: string): string;
  };
}

interface IAutoConfigOptions {
  config?: string;
  autoConfig?: boolean;
}

export interface IAutoConfigContext<TOptions extends IAutoConfigOptions> {
  targetDir: string;
  configOptions: TOptions;
  autoDiscoveredConfig?: string;
}

/**
 * Decorates command execute methods with shared auto-config discovery behavior.
 * @returns A method decorator that resolves target-directory config files before execution.
 */
export function WithAutoConfigDiscovery<TOptions extends IAutoConfigOptions>(): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as (
      directory: string,
      options: TOptions,
      context?: IAutoConfigContext<TOptions>
    ) => unknown;

    descriptor.value = function (directory: string, options: TOptions): unknown {
      const service = this as IConfigDiscoveryCapable;
      const targetDir = service.directoryValidator.validate(directory);
      const configOptions = { ...options };
      let autoDiscoveredConfig: string | undefined;

      if (!configOptions.config && options.autoConfig) {
        const targetConfig = service.configService.findConfigInDirectory(targetDir);
        if (targetConfig) {
          configOptions.config = targetConfig;
          autoDiscoveredConfig = targetConfig;
        }
      }

      return originalMethod.call(this, directory, options, {
        targetDir,
        configOptions,
        autoDiscoveredConfig
      });
    };

    return descriptor;
  };
}
