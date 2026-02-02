import { OperationExecutor } from './operation-executor';
import { FileOperationType } from './types';
import type { IFileOperation } from './types';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';
import { DEFAULT_CONFIG, type OrderlyConfig } from '../config/types';
import * as path from 'node:path';

jest.mock('../logger/logger');
jest.mock('../utils/file-system-utils');

describe('OperationExecutor', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;

  let executor: OperationExecutor;
  let loggerInstance: jest.Mocked<Logger>;
  let testOperation: IFileOperation;
  let testOperations: IFileOperation[];

  beforeEach(() => {
    loggerInstance = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;
    testOperation = {
      type: FileOperationType.MOVE,
      originalPath: '/source/file.txt',
      newPath: '/target/file.txt',
      reason: 'Moving to target'
    };
    testOperations = [testOperation];
    executor = new OperationExecutor(loggerInstance, false, undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute (dry run)', () => {
    it('should log operations without executing in dry run mode', () => {
      const dryRunExecutor = new OperationExecutor(loggerInstance, true, undefined);

      const result = dryRunExecutor.execute(testOperations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFileSystemUtils.renameSync).not.toHaveBeenCalled();
      expect(loggerInstance.info).toHaveBeenCalledTimes(2);
      expect(loggerInstance.info).toHaveBeenNthCalledWith(1, expect.stringContaining('DRY RUN'));
      expect(loggerInstance.info).toHaveBeenNthCalledWith(2, expect.stringContaining('move'));
    });

    it('should log all operations in dry run mode', () => {
      const dryRunExecutor = new OperationExecutor(loggerInstance, true, undefined);
      const operations = [testOperation, { ...testOperation, originalPath: '/source/file2.txt' }];

      const result = dryRunExecutor.execute(operations);

      expect(result.successful).toBe(2);
      expect(loggerInstance.info).toHaveBeenCalledTimes(3); // 1 header + 2 operations
      expect(loggerInstance.info).toHaveBeenNthCalledWith(1, expect.stringContaining('DRY RUN'));
    });
  });

  describe('execute (real)', () => {
    it('should execute operation successfully', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);

      const result = executor.execute(testOperations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockFileSystemUtils.mkdirSync).toHaveBeenCalledTimes(1);
      expect(mockFileSystemUtils.mkdirSync).toHaveBeenNthCalledWith(1, '/target');
      expect(mockFileSystemUtils.renameSync).toHaveBeenCalledTimes(1);
      expect(mockFileSystemUtils.renameSync).toHaveBeenNthCalledWith(
        1,
        testOperation.originalPath,
        testOperation.newPath
      );
    });

    it('should create target directory if it does not exist', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);

      executor.execute(testOperations);

      expect(mockFileSystemUtils.mkdirSync).toHaveBeenCalledTimes(1);
      expect(mockFileSystemUtils.mkdirSync).toHaveBeenNthCalledWith(1, '/target');
    });

    it('should handle collision when target file already exists', () => {
      const config: OrderlyConfig = {
        ...DEFAULT_CONFIG,
        collisionResolution: { strategy: 'skip' }
      };
      const executorWithConfig = new OperationExecutor(loggerInstance, false, config);

      // Mock existsSync to return true for collision
      mockFileSystemUtils.existsSync.mockReturnValue(true);

      const result = executorWithConfig.execute(testOperations);

      expect(mockFileSystemUtils.existsSync).toHaveBeenCalledWith('/target/file.txt');
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(loggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping /source/file.txt due to collision resolution strategy')
      );
      expect(mockFileSystemUtils.renameSync).not.toHaveBeenCalled();
    });

    it('should handle collision with keep-both strategy', () => {
      const config = { ...DEFAULT_CONFIG, collisionResolution: { strategy: 'keep-both' as const } };
      const executorWithConfig = new OperationExecutor(loggerInstance, false, config);

      // Mock existsSync to return true for collision, then false for suggested name
      mockFileSystemUtils.existsSync.mockImplementation((path: string) => {
        return path === '/target/file.txt'; // Collision exists
      });

      const result = executorWithConfig.execute(testOperations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFileSystemUtils.renameSync).toHaveBeenCalledWith(
        '/source/file.txt',
        '/target/file-1.txt'.replaceAll('/', path.sep)
      );
    });

    it('should handle collision with replace strategy', () => {
      const config = { ...DEFAULT_CONFIG, collisionResolution: { strategy: 'replace' as const } };
      const executorWithConfig = new OperationExecutor(loggerInstance, false, config);

      // Mock existsSync to return true for collision
      mockFileSystemUtils.existsSync.mockReturnValue(true);

      const result = executorWithConfig.execute(testOperations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFileSystemUtils.renameSync).toHaveBeenCalledWith(
        '/source/file.txt',
        '/target/file.txt'
      );
    });

    it('should handle multiple operations', () => {
      const operations = [
        testOperation,
        { ...testOperation, originalPath: '/source/file2.txt', newPath: '/target/file2.txt' }
      ];
      mockFileSystemUtils.existsSync.mockReturnValue(false);

      const result = executor.execute(operations);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockFileSystemUtils.renameSync).toHaveBeenCalledTimes(2);
    });

    it('should continue processing after one operation fails', () => {
      const operations = [
        testOperation,
        { ...testOperation, originalPath: '/source/file2.txt', newPath: '/target/file2.txt' }
      ];
      mockFileSystemUtils.existsSync.mockReturnValue(false);
      mockFileSystemUtils.renameSync
        .mockImplementationOnce(() => {
          throw new Error('File locked');
        })
        .mockImplementationOnce(() => {});

      const result = executor.execute(operations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('/source/file.txt');
    });

    it('should log successful operation', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);

      executor.execute(testOperations);

      expect(loggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.objectContaining({
          from: testOperation.originalPath,
          to: testOperation.newPath
        })
      );
    });

    it('should log failed operation', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);
      mockFileSystemUtils.renameSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      executor.execute(testOperations);

      expect(loggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining('✗'),
        expect.stringContaining('Permission denied')
      );
    });

    it('should handle non-Error exceptions', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);
      mockFileSystemUtils.renameSync.mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw { message: 'Custom error' } as any;
      });

      const result = executor.execute(testOperations);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('[object Object]');
      expect(loggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining('✗'),
        '[object Object]'
      );
    });

    it('should allow rename when target equals original', () => {
      const samePathOperation = {
        ...testOperation,
        originalPath: '/same/file.txt',
        newPath: '/same/file.txt'
      };
      mockFileSystemUtils.existsSync.mockReturnValue(true);
      mockFileSystemUtils.mkdirSync.mockReturnValue(undefined);
      mockFileSystemUtils.renameSync.mockReturnValue(undefined);

      const result = executor.execute([samePathOperation]);

      expect(result.successful).toBe(1);
      expect(mockFileSystemUtils.renameSync).toHaveBeenCalledTimes(1);
      expect(mockFileSystemUtils.renameSync).toHaveBeenNthCalledWith(
        1,
        '/same/file.txt',
        '/same/file.txt'
      );
    });
  });
});
