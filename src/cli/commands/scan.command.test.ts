import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
import { ScanWorkflow } from '../services';
import { ScanHandler } from './scan.command';

jest.mock('chalk');
jest.mock('../../logger/logger');
jest.mock('../../scanner/file-scanner');

describe('ScanHandler', () => {
  const mockConfigService = {
    loadWithOverrides: jest.fn(),
    findConfigInDirectory: jest.fn()
  };
  const mockDirectoryValidator = {
    validate: jest.fn()
  };
  const mockLogger = Logger as jest.MockedClass<typeof Logger>;
  const mockFileScanner = FileScanner as jest.MockedClass<typeof FileScanner>;
  const mockWorkflow = {
    run: jest.fn()
  };

  let handler: ScanHandler;

  beforeEach(() => {
    handler = new ScanHandler(
      mockConfigService as any,
      mockDirectoryValidator as any,
      mockWorkflow as unknown as ScanWorkflow
    );
    jest.clearAllMocks();
    mockWorkflow.run.mockResolvedValue([]);
  });

  it('should scan files successfully through the workflow', async () => {
    const config = { logLevel: 'info' as any };
    const targetDir = '/test/dir';

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);
    mockWorkflow.run.mockResolvedValue([
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' }
    ]);

    const result = await handler.execute(targetDir, {});

    expect(result.success).toBe(true);
    expect(result.message).toContain('Found 1 files');
    expect(mockWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({ targetDir: '/test/dir' }),
      undefined
    );
  });

  it('should create scanner context for the workflow', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'info' });
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');

    await handler.execute('/test/dir', {});

    expect(mockFileScanner).toHaveBeenCalledTimes(1);
  });

  it('should pass the requested output format to the workflow', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'info' });
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');

    await handler.execute('/test/dir', { format: 'json' });

    expect(mockWorkflow.run).toHaveBeenCalledWith(expect.anything(), 'json');
  });

  it('should handle scan errors', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'info' });
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');
    mockWorkflow.run.mockRejectedValue(new Error('Scan failed'));

    const result = await handler.execute('/test/dir', {});

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Scan failed: Scan failed');
  });

  it('should accept auto-discovered config context', async () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'info' });
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');

    await handler.execute(
      '/ignored',
      {},
      {
        autoDiscoveredConfig: '/test/dir/.orderly.yml',
        configOptions: {},
        targetDir: '/test/dir'
      }
    );

    expect(mockWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({ targetDir: '/test/dir' }),
      undefined
    );
  });

  it('should build command context from direct options when no auto-config context exists', () => {
    mockConfigService.loadWithOverrides.mockReturnValue({ logLevel: 'info' });
    mockDirectoryValidator.validate.mockReturnValue('/validated');

    const result = (handler as any).createCommandContext('/input', { format: 'json' }, undefined);

    expect(mockDirectoryValidator.validate).toHaveBeenCalledWith('/input');
    expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({ format: 'json' });
    expect(result.targetDir).toBe('/validated');
  });
});
