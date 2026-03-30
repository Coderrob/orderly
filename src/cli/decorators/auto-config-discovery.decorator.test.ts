import {
  IAutoConfigContext,
  WithAutoConfigDiscovery,
  createAutoConfigContextResolver,
  normalizeAutoConfigContext,
  resolveAutoConfigContext
} from './auto-config-discovery.decorator';

interface ITestOptions {
  config?: string;
  autoConfig?: boolean;
}

describe('WithAutoConfigDiscovery', () => {
  it('should validate directory and pass resolved context to the original method', () => {
    const validate = jest.fn().mockReturnValue('/resolved');
    const findConfigInDirectory = jest.fn().mockReturnValue('/resolved/.orderly.yml');

    class TestHandler {
      public configService = { findConfigInDirectory };
      public directoryValidator = { validate };

      @WithAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        _options: ITestOptions,
        context?: IAutoConfigContext<ITestOptions>
      ): IAutoConfigContext<ITestOptions> | undefined {
        return context;
      }
    }

    const context = new TestHandler().execute('/input', {});

    expect(validate).toHaveBeenCalledWith('/input');
    expect(findConfigInDirectory).toHaveBeenCalledWith('/resolved');
    expect(context).toEqual({
      targetDir: '/resolved',
      configOptions: { config: '/resolved/.orderly.yml' },
      autoDiscoveredConfig: '/resolved/.orderly.yml'
    });
  });

  it('should not discover config when autoConfig is false', () => {
    const validate = jest.fn().mockReturnValue('/resolved');
    const findConfigInDirectory = jest.fn().mockReturnValue('/resolved/.orderly.yml');

    class TestHandler {
      public configService = { findConfigInDirectory };
      public directoryValidator = { validate };

      @WithAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        _options: ITestOptions,
        context?: IAutoConfigContext<ITestOptions>
      ): IAutoConfigContext<ITestOptions> | undefined {
        return context;
      }
    }

    const context = new TestHandler().execute('/input', { autoConfig: false });

    expect(findConfigInDirectory).not.toHaveBeenCalled();
    expect(context).toEqual({
      targetDir: '/resolved',
      configOptions: { autoConfig: false },
      autoDiscoveredConfig: undefined
    });
  });

  it('should preserve explicit config without triggering discovery', () => {
    const validate = jest.fn().mockReturnValue('/resolved');
    const findConfigInDirectory = jest.fn();

    class TestHandler {
      public configService = { findConfigInDirectory };
      public directoryValidator = { validate };

      @WithAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        _options: ITestOptions,
        context?: IAutoConfigContext<ITestOptions>
      ): IAutoConfigContext<ITestOptions> | undefined {
        return context;
      }
    }

    const context = new TestHandler().execute('/input', { config: '/explicit/.orderly.yml' });

    expect(findConfigInDirectory).not.toHaveBeenCalled();
    expect(context).toEqual({
      targetDir: '/resolved',
      configOptions: { config: '/explicit/.orderly.yml' },
      autoDiscoveredConfig: undefined
    });
  });

  it('should omit auto-discovered config when discovery returns null', () => {
    const validate = jest.fn().mockReturnValue('/resolved');
    const findConfigInDirectory = jest.fn().mockReturnValue(null);

    class TestHandler {
      public configService = { findConfigInDirectory };
      public directoryValidator = { validate };

      @WithAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        _options: ITestOptions,
        context?: IAutoConfigContext<ITestOptions>
      ): IAutoConfigContext<ITestOptions> | undefined {
        return context;
      }
    }

    const context = new TestHandler().execute('/input', {});

    expect(context).toEqual({
      targetDir: '/resolved',
      configOptions: {},
      autoDiscoveredConfig: undefined
    });
  });

  it('should skip context injection when the receiver cannot discover config', () => {
    class TestHandler {
      @WithAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        _options: ITestOptions,
        context?: IAutoConfigContext<ITestOptions>
      ): IAutoConfigContext<ITestOptions> | undefined {
        return context;
      }
    }

    expect(new TestHandler().execute('/input', {})).toBeUndefined();
  });

  it('should leave non-callable descriptors unchanged', () => {
    const decorator = WithAutoConfigDiscovery<ITestOptions>();
    const descriptor: PropertyDescriptor = { configurable: true, value: 'not-a-function' };

    const result = decorator({}, 'execute', descriptor);

    expect(result).toEqual(descriptor);
  });
});

describe('auto-config plain wrapper helpers', () => {
  it('should normalize values matching auto-config context', () => {
    const context = normalizeAutoConfigContext<ITestOptions>({
      autoDiscoveredConfig: '/resolved/.orderly.yml',
      configOptions: { config: '/resolved/.orderly.yml' },
      targetDir: '/resolved'
    });

    expect(context).toEqual({
      autoDiscoveredConfig: '/resolved/.orderly.yml',
      configOptions: { config: '/resolved/.orderly.yml' },
      targetDir: '/resolved'
    });
  });

  it('should return undefined for values that are not auto-config context', () => {
    expect(normalizeAutoConfigContext<ITestOptions>({ targetDir: 123 })).toBeUndefined();
  });

  it('should reuse provided context when resolving plain wrapper auto-config', () => {
    const findConfigInDirectory = jest.fn();
    const validate = jest.fn();
    const context: Readonly<IAutoConfigContext<ITestOptions>> = {
      autoDiscoveredConfig: '/provided/.orderly.yml',
      configOptions: { config: '/provided/.orderly.yml' },
      targetDir: '/provided'
    };

    const result = resolveAutoConfigContext(
      {
        configService: { findConfigInDirectory },
        directoryValidator: { validate }
      },
      '/input',
      {},
      context
    );

    expect(result).toBe(context);
    expect(validate).not.toHaveBeenCalled();
    expect(findConfigInDirectory).not.toHaveBeenCalled();
  });

  it('should create a plain wrapper resolver that discovers config when needed', () => {
    const validate = jest.fn().mockReturnValue('/resolved');
    const findConfigInDirectory = jest.fn().mockReturnValue('/resolved/.orderly.yml');
    const resolveContext = createAutoConfigContextResolver<ITestOptions>({
      configService: { findConfigInDirectory },
      directoryValidator: { validate }
    });

    const context = resolveContext('/input', {}, undefined);

    expect(validate).toHaveBeenCalledWith('/input');
    expect(findConfigInDirectory).toHaveBeenCalledWith('/resolved');
    expect(context).toEqual({
      autoDiscoveredConfig: '/resolved/.orderly.yml',
      configOptions: { config: '/resolved/.orderly.yml' },
      targetDir: '/resolved'
    });
  });
});
