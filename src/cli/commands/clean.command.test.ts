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
});
