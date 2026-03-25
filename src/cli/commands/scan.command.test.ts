import { Logger } from '../../logger/logger';
import { FileScanner } from '../../scanner/file-scanner';
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
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

  let handler: ScanHandler;

  beforeEach(() => {
    handler = new ScanHandler(mockConfigService as any, mockDirectoryValidator as any);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  it('should scan files successfully in table format', async () => {
    const config = { logLevel: 'info' as any };
    const targetDir = '/test/dir';
    const files = [
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' } as any,
      { filename: 'file2.txt', extension: '.txt', size: 20 } as any
    ];
    const summary = new Map([
      ['document', 1],
      ['uncategorized', 1]
    ]);

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);
    mockFileScanner.prototype.scan.mockResolvedValue(files);
    mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

    const result = await handler.execute(targetDir, {});

    expect(result.success).toBe(true);
    expect(result.message).toContain('Found 2 files');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nOrderly - File Scan Results\n');
    expect(mockConsoleLog).toHaveBeenCalledWith('  document: 1');
    expect(mockConsoleLog).toHaveBeenCalledWith('  uncategorized: 1');
  });

  it('should emit JSON output when format is json', async () => {
    const config = { logLevel: 'info' as any };
    const targetDir = '/test/dir';
    const files = [
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' } as any
    ];
    const summary = new Map([['document', 1]]);

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);
    mockFileScanner.prototype.scan.mockResolvedValue(files);
    mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

    await handler.execute(targetDir, { format: 'json' });

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"summary"'));
  });

  it('should emit CSV output when format is csv', async () => {
    const config = { logLevel: 'info' as any };
    const targetDir = '/test/dir';
    const files = [
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' } as any
    ];
    const summary = new Map([['document', 1]]);

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);
    mockFileScanner.prototype.scan.mockResolvedValue(files);
    mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

    await handler.execute(targetDir, { format: 'csv' });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('filename,extension,category,size')
    );
  });

  it('should use uncategorized in CSV output when category is missing', () => {
    const output = (handler as any).formatResults(
      [{ filename: 'file1.txt', extension: '.txt', size: 10 }],
      { getCategorySummary: jest.fn().mockReturnValue(new Map()) },
      'csv'
    );

    expect(output).toContain('file1.txt,.txt,uncategorized,10');
  });

  it('should fall back to table output for unknown formats', async () => {
    const config = { logLevel: 'info' as any };
    const targetDir = '/test/dir';
    const files = [{ filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' }];
    const summary = new Map([['document', 1]]);

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue(targetDir);
    mockFileScanner.prototype.scan.mockResolvedValue(files as any);
    mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

    await handler.execute(targetDir, { format: 'xml' });

    expect(mockConsoleLog).toHaveBeenCalledWith('\nOrderly - File Scan Results\n');
  });

  it('should omit sample file lines when the scan is empty', async () => {
    const config = { logLevel: 'info' as any };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');
    mockFileScanner.prototype.scan.mockResolvedValue([]);
    mockFileScanner.prototype.getCategorySummary.mockReturnValue(new Map());

    await handler.execute('/test/dir', {});

    expect(mockConsoleLog).not.toHaveBeenCalledWith('Sample files:');
  });

  it('should handle scan errors', async () => {
    const config = { logLevel: 'info' as any };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');
    mockFileScanner.prototype.scan.mockRejectedValue(new Error('Scan failed'));

    const result = await handler.execute('/test/dir', {});

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Scan failed: Scan failed');
  });

  it('should accept auto-discovered config context', async () => {
    const config = { logLevel: 'info' as any };

    mockConfigService.loadWithOverrides.mockReturnValue(config);
    mockDirectoryValidator.validate.mockReturnValue('/test/dir');
    mockFileScanner.prototype.scan.mockResolvedValue([]);
    mockFileScanner.prototype.getCategorySummary.mockReturnValue(new Map());

    await handler.execute(
      '/test/dir',
      {},
      {
        autoDiscoveredConfig: '/test/dir/.orderly.yml',
        configOptions: {},
        targetDir: '/test/dir'
      }
    );

    expect(mockFileScanner.prototype.scan).toHaveBeenCalledWith('/test/dir');
  });

  it('should log auto-discovered config paths through the private helper', () => {
    const logger = { info: jest.fn() };

    (handler as any).logAutoDiscoveredConfig(logger, '/test/dir/.orderly.yml');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/test/dir/.orderly.yml'));
  });

  it('should build table output through the private formatter', () => {
    const scanner = {
      getCategorySummary: jest.fn().mockReturnValue(new Map([['document', 1]]))
    };

    const output = (handler as any).formatResults(
      [{ filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' }],
      scanner,
      'table'
    );

    expect(output).toContain('File categories:');
    expect(output).toContain('  document: 1');
  });

  it('should append a remaining-files line when more than the display limit exist', () => {
    const files = Array.from({ length: 7 }, (_, index) => ({
      filename: `file-${index + 1}.txt`,
      extension: '.txt',
      size: 10,
      category: 'document'
    }));

    const lines = (handler as any).createSampleLines(files);

    expect(lines).toContain('  ... and 2 more files');
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
