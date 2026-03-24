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

  // Mock console methods
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

  let handler: ScanHandler;

  beforeEach(() => {
    handler = new ScanHandler(mockConfigService as any, mockDirectoryValidator as any);
    jest.clearAllMocks();
    mockLogger.mockClear();
    mockFileScanner.mockClear();
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('execute', () => {
    it('should scan files successfully', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const files = [
        { filename: 'file1.txt', category: 'document' } as any,
        { filename: 'file2.txt', category: 'document' } as any,
        { filename: 'file3.txt', category: 'document' } as any,
        { filename: 'file4.txt', category: 'document' } as any,
        { filename: 'file5.txt' } as any,
        { filename: 'file6.txt', category: 'document' } as any
      ];
      const summary = new Map([['document', 6]]);

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      const result = await handler.execute(targetDir, {});

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Found 6 files');
      expect(mockConfigService.loadWithOverrides).toHaveBeenCalledWith({});
      expect(mockDirectoryValidator.validate).toHaveBeenCalledWith(targetDir);
      expect(mockFileScanner.prototype.scan).toHaveBeenCalledWith(targetDir);
      expect(mockFileScanner.prototype.getCategorySummary).toHaveBeenCalledWith(files);

      // Verify display output
      expect(mockConsoleLog).toHaveBeenCalledWith('\n🗂️  Orderly - File Scan Results\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('Found 6 files\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('File categories:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  document: 6');
      expect(mockConsoleLog).toHaveBeenCalledWith('\nSample files:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  1. file1.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  2. file2.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  3. file3.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  4. file4.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  5. file5.txt (uncategorized)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  ... and 1 more files');
    });

    it('should display truncated file list when more than 6 files', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const files = Array.from(
        { length: 8 },
        (_, i) =>
          ({
            filename: `file${i + 1}.txt`,
            category: 'document'
          }) as any
      );
      const summary = new Map([['document', 8]]);

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      const result = await handler.execute(targetDir, {});

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Found 8 files');

      // Verify display output - should show only 5 files
      expect(mockConsoleLog).toHaveBeenCalledWith('\n🗂️  Orderly - File Scan Results\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('Found 8 files\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('File categories:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  document: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('\nSample files:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  1. file1.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  2. file2.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  3. file3.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  4. file4.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  5. file5.txt (document)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  ... and 3 more files');
    });

    it('should handle scan error', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockRejectedValue(new Error('Scan failed'));

      const result = await handler.execute(targetDir, {});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Scan failed: Scan failed');
    });

    it('should handle scan error with non-Error object', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockRejectedValue('Scan failed string');

      const result = await handler.execute(targetDir, {});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Scan failed: Scan failed string');
    });

    it('should handle scan with no files found', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const files: any[] = [];
      const summary = new Map();

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      const result = await handler.execute(targetDir, {});

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Found 0 files');

      // Verify display output for empty results
      expect(mockConsoleLog).toHaveBeenCalledWith('\n🗂️  Orderly - File Scan Results\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('Found 0 files\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('File categories:');
      // Should not show sample files section when no files
      expect(mockConsoleLog).not.toHaveBeenCalledWith('\nSample files:');
    });

    it('should log auto-discovered config via logger instead of console.log', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const discoveredConfig = '/test/dir/.orderly.yml';
      const files: any[] = [];
      const summary = new Map();

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockConfigService.findConfigInDirectory.mockReturnValue(discoveredConfig);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      await handler.execute(targetDir, {});

      const loggerInstance = mockLogger.mock.instances[0];
      expect(loggerInstance.info).toHaveBeenCalledWith(
        `Using config file found in target directory: ${discoveredConfig}`
      );
      // Ensure the auto-discovery message did not go through console.log directly
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Using config file found in target directory:')
      );
    });

    it('should not log auto-discovery message when config is explicitly provided', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const files: any[] = [];
      const summary = new Map();

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      await handler.execute(targetDir, { config: '/explicit/config.yml' });

      expect(mockConfigService.findConfigInDirectory).not.toHaveBeenCalled();
      const loggerInstance = mockLogger.mock.instances[0];
      expect(loggerInstance.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Using config file found in target directory:')
      );
    });

    it('should not auto-discover config when autoConfig is false', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const files: any[] = [];
      const summary = new Map();

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      await handler.execute(targetDir, { autoConfig: false });

      expect(mockConfigService.findConfigInDirectory).not.toHaveBeenCalled();
    });

    it('should handle config load error', async () => {
      mockConfigService.loadWithOverrides.mockImplementation(() => {
        throw new Error('Config error');
      });

      const result = await handler.execute('/test', {});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Scan failed: Config error');
    });

    it('should handle directory validation error', async () => {
      const config = { logLevel: 'info' as any };

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockImplementation(() => {
        throw new Error('Invalid dir');
      });

      const result = await handler.execute('/test', {});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Scan failed: Invalid dir');
    });

    it('should handle multiple categories', async () => {
      const config = { logLevel: 'info' as any };
      const targetDir = '/test/dir';
      const files = [
        { filename: 'file1.txt', category: 'document' } as any,
        { filename: 'file2.jpg', category: 'image' } as any,
        { filename: 'file3.mp3', category: 'audio' } as any
      ];
      const summary = new Map([
        ['document', 1],
        ['image', 1],
        ['audio', 1]
      ]);

      mockConfigService.loadWithOverrides.mockReturnValue(config);
      mockDirectoryValidator.validate.mockReturnValue(targetDir);
      mockFileScanner.prototype.scan.mockResolvedValue(files);
      mockFileScanner.prototype.getCategorySummary.mockReturnValue(summary);

      const result = await handler.execute(targetDir, {});

      expect(result.success).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith('  document: 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('  image: 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('  audio: 1');
    });
  });
});
