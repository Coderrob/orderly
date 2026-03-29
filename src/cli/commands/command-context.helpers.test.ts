import {
  createScannerCommandContext,
  createCommandContextBase,
  createMappedCommandContextBase,
  logAutoDiscoveredConfig,
  normalizeCommandContextOptions
} from './command-context.helpers';

jest.mock('../../scanner/file-scanner', () => ({
  FileScanner: jest.fn().mockImplementation(() => ({
    scan: jest.fn()
  }))
}));

describe('command context helpers', () => {
  const mockConfigService = {
    loadWithOverrides: jest.fn()
  };
  const mockDirectoryValidator = {
    validate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create direct command context from validated directory and raw options', () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'info' });
    mockDirectoryValidator.validate.mockReturnValue('/validated');

    const result = createCommandContextBase({
      directory: '/input',
      options: { format: 'json' },
      context: undefined,
      configService: mockConfigService as never,
      directoryValidator: mockDirectoryValidator as never
    });

    expect(mockDirectoryValidator.validate).toHaveBeenCalledWith('/input');
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({ format: 'json' });
    expect(result.targetDir).toBe('/validated');
  });

  it('should create mapped command context from auto-config context options', () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'debug' });

    const result = createMappedCommandContextBase({
      directory: '/ignored',
      options: { dryRun: false },
      context: {
        autoDiscoveredConfig: '/target/.orderly.yml',
        configOptions: { dryRun: true },
        targetDir: '/target'
      },
      configService: mockConfigService as never,
      directoryValidator: mockDirectoryValidator as never,
      toConfigOverrides: (options) => ({
        dryRun: options.dryRun
      })
    });

    expect(mockDirectoryValidator.validate).not.toHaveBeenCalled();
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({ dryRun: true });
    expect(result.configOptions).toEqual({ dryRun: true });
    expect(result.targetDir).toBe('/target');
  });

  it('should log an auto-discovered config path when present', () => {
    const logger = { info: jest.fn() };

    logAutoDiscoveredConfig(logger as never, '/target/.orderly.yml');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/target/.orderly.yml'));
  });

  it('should not log when no auto-discovered config path is present', () => {
    const logger = { info: jest.fn() };

    logAutoDiscoveredConfig(logger as never, undefined);

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should add a file scanner to a resolved command context', () => {
    const context = createScannerCommandContext({
      config: { logLevel: 'info' } as never,
      logger: { info: jest.fn() } as never,
      targetDir: '/target'
    });

    expect(context.targetDir).toBe('/target');
    expect(context.scanner).toBeDefined();
  });

  it('should normalize config options inside an optional command context', () => {
    const result = normalizeCommandContextOptions(
      {
        autoDiscoveredConfig: '/target/.orderly.yml',
        configOptions: { dryRun: undefined, preset: 'fast' },
        targetDir: '/target'
      },
      (options) => ({
        confirmReplace: false,
        dryRun: options.dryRun,
        preset: options.preset
      })
    );

    expect(result).toEqual({
      autoDiscoveredConfig: '/target/.orderly.yml',
      configOptions: {
        confirmReplace: false,
        dryRun: undefined,
        preset: 'fast'
      },
      targetDir: '/target'
    });
  });

  it('should return undefined when normalizing a missing command context', () => {
    expect(normalizeCommandContextOptions(undefined, (options: Readonly<{}>) => options)).toBeUndefined();
  });
});
