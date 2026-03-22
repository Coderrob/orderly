import { WithCliAutoConfigDiscovery } from './cli-auto-config-discovery.decorator';

interface ITestOptions {
  config?: string;
  autoConfig?: boolean;
}

describe('WithCliAutoConfigDiscovery', () => {
  it('should pass discovered config through options and context argument', () => {
    const findConfigInDirectory = jest.fn().mockReturnValue('/test/.orderly.yml');

    class TestService {
      public findConfigInDirectory = findConfigInDirectory;

      @WithCliAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        options: ITestOptions,
        autoDiscoveredConfig?: string
      ): { options: ITestOptions; autoDiscoveredConfig?: string } {
        return { options, autoDiscoveredConfig };
      }
    }

    const result = new TestService().execute('/target', {});

    expect(findConfigInDirectory).toHaveBeenCalledWith('/target');
    expect(result).toEqual({
      options: { config: '/test/.orderly.yml' },
      autoDiscoveredConfig: '/test/.orderly.yml'
    });
  });

  it('should skip discovery when autoConfig is false', () => {
    const findConfigInDirectory = jest.fn().mockReturnValue('/test/.orderly.yml');

    class TestService {
      public findConfigInDirectory = findConfigInDirectory;

      @WithCliAutoConfigDiscovery<ITestOptions>()
      execute(
        _directory: string,
        options: ITestOptions,
        autoDiscoveredConfig?: string
      ): { options: ITestOptions; autoDiscoveredConfig?: string } {
        return { options, autoDiscoveredConfig };
      }
    }

    const result = new TestService().execute('/target', { autoConfig: false });

    expect(findConfigInDirectory).not.toHaveBeenCalled();
    expect(result).toEqual({ options: { autoConfig: false }, autoDiscoveredConfig: undefined });
  });
});
