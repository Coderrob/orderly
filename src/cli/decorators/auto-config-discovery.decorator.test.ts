import { IAutoConfigContext, WithAutoConfigDiscovery } from './auto-config-discovery.decorator';

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
});
