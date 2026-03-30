import { CleanHandler } from './clean.command';

describe('CleanHandler', () => {
  const mockCleaner = {
    clean: jest.fn()
  };
  const mockConfigService = {
    findConfigInDirectory: jest.fn(),
    loadWithOverrides: jest.fn()
  };
  const mockDirectoryValidator = {
    validate: jest.fn()
  };

  let handler: CleanHandler;

  beforeEach(() => {
    handler = new CleanHandler(
      mockCleaner as any,
      mockConfigService as any,
      mockDirectoryValidator as any
    );
    jest.clearAllMocks();
  });

  it('should clean directories successfully', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/target');
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 4,
      removedDirectories: 2,
      skippedDirectories: 2,
      removed: [],
      errors: []
    });

    const result = await handler.execute('/target', {});

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('Scanned 4 directories, removed 2, skipped 2');
    expect(mockCleaner.clean).toHaveBeenCalledWith('/target', {
      dryRun: false,
      includeHidden: false,
      removeOrderlyDir: false
    });
  });

  it('should return failure when cleaner reports errors', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/target');
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 1,
      removedDirectories: 0,
      skippedDirectories: 0,
      removed: [],
      errors: [{ path: '/target/a', error: 'denied' }]
    });

    const result = await handler.execute('/target', {});

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('should accept an auto-discovered config context', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 0,
      removedDirectories: 0,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });

    const result = await handler.execute(
      '/ignored',
      {},
      {
        autoDiscoveredConfig: '/target/.orderly.yml',
        configOptions: {},
        targetDir: '/target'
      }
    );

    expect(result.success).toBe(true);
    expect(mockCleaner.clean).toHaveBeenCalledWith('/target', {
      dryRun: false,
      includeHidden: false,
      removeOrderlyDir: false
    });
  });

  it('should auto-discover config through the plain wrapper path', async () => {
    mockConfigService.findConfigInDirectory.mockReturnValue('/target/.orderly.yml');
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/target');
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 0,
      removedDirectories: 0,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });

    await handler.execute('/input', {});

    expect(mockDirectoryValidator.validate).toHaveBeenCalledWith('/input');
    expect(mockConfigService.findConfigInDirectory).toHaveBeenCalledWith('/target');
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({
      config: '/target/.orderly.yml',
      dryRun: undefined,
      logLevel: undefined
    });
  });

  it('should skip auto-discovery when explicit config is provided', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/target');
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 0,
      removedDirectories: 0,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });

    await handler.execute('/input', { config: '/explicit/.orderly.yml' });

    expect(mockConfigService.findConfigInDirectory).not.toHaveBeenCalled();
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({
      config: '/explicit/.orderly.yml',
      dryRun: undefined,
      logLevel: undefined
    });
  });

  it('should skip auto-discovery when auto-config is disabled', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/target');
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 0,
      removedDirectories: 0,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });

    await handler.execute('/input', { autoConfig: false });

    expect(mockConfigService.findConfigInDirectory).not.toHaveBeenCalled();
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({
      config: undefined,
      dryRun: undefined,
      logLevel: undefined
    });
  });

  it('should honor explicit clean option overrides', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: false,
      includeHidden: false,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/target');
    mockCleaner.clean.mockReturnValue({
      scannedDirectories: 1,
      removedDirectories: 1,
      skippedDirectories: 0,
      removed: [],
      errors: []
    });

    await handler.execute('/target', {
      dryRun: true,
      includeHidden: true,
      removeOrderlyDir: true
    });

    expect(mockCleaner.clean).toHaveBeenCalledWith('/target', {
      dryRun: true,
      includeHidden: true,
      removeOrderlyDir: true
    });
  });

  it('should log cleaner errors through the private summary logger', () => {
    const logger = { info: jest.fn(), error: jest.fn() };

    (handler as any).logSummary(
      {
        scannedDirectories: 1,
        removedDirectories: 0,
        skippedDirectories: 1,
        errors: [{ path: '/target/a', error: 'denied' }]
      },
      logger
    );

    expect(logger.info).toHaveBeenCalledWith('Scanned 1 directories, removed 0, skipped 1');
    expect(logger.error).toHaveBeenCalledWith('/target/a: denied');
  });

  it('should build a successful result through the private result builder', () => {
    const result = handler['buildResult']({
      scannedDirectories: 2,
      removedDirectories: 1,
      skippedDirectories: 1,
      errors: []
    });

    expect(result).toEqual({
      success: true,
      exitCode: 0,
      message: 'Scanned 2 directories, removed 1, skipped 1'
    });
  });

  it('should build command context from direct options when no auto-config context exists', () => {
    mockConfigService.loadWithOverrides.mockReturnValue({
      dryRun: true,
      includeHidden: true,
      logLevel: 'info'
    });
    mockDirectoryValidator.validate.mockReturnValue('/validated');

    const result = (handler as any).createCommandContext('/input', { dryRun: false }, undefined);

    expect(mockDirectoryValidator.validate).toHaveBeenCalledWith('/input');
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({
      config: undefined,
      dryRun: false,
      logLevel: undefined
    });
    expect(result.targetDir).toBe('/validated');
  });
});
