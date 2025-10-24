import { OperationExecutor } from './operation-executor';
import { FileOperation, FileOperationType } from './file-organizer';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';

jest.mock('../logger/logger');
jest.mock('../utils/file-system-utils');

describe('OperationExecutor', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;

  let executor: OperationExecutor;
  let loggerInstance: jest.Mocked<Logger>;
  let testOperation: FileOperation;
  let testOperations: FileOperation[];

  beforeEach(() => {
    loggerInstance = {
      info: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;
    testOperation = {
      type: FileOperationType.MOVE,
      originalPath: '/source/file.txt',
      newPath: '/target/file.txt',
      reason: 'Moving to target'
    };
    testOperations = [testOperation];
    executor = new OperationExecutor(loggerInstance, false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute (dry run)', () => {
    it('should log operations without executing in dry run mode', async () => {
      const dryRunExecutor = new OperationExecutor(loggerInstance, true);

      const result = await dryRunExecutor.execute(testOperations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFileSystemUtils.rename).not.toHaveBeenCalled();
      expect(loggerInstance.info).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    });

    it('should log all operations in dry run mode', async () => {
      const dryRunExecutor = new OperationExecutor(loggerInstance, true);
      const operations = [testOperation, { ...testOperation, originalPath: '/source/file2.txt' }];

      const result = await dryRunExecutor.execute(operations);

      expect(result.successful).toBe(2);
      expect(loggerInstance.info).toHaveBeenCalledTimes(3); // 1 header + 2 operations
    });
  });

  describe('execute (real)', () => {
    it('should execute operation successfully', async () => {
      mockFileSystemUtils.exists.mockReturnValue(false);

      const result = await executor.execute(testOperations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockFileSystemUtils.mkdir).toHaveBeenCalled();
      expect(mockFileSystemUtils.rename).toHaveBeenCalledWith(
        testOperation.originalPath,
        testOperation.newPath
      );
    });

    it('should create target directory if it does not exist', async () => {
      mockFileSystemUtils.exists.mockReturnValue(false);

      await executor.execute(testOperations);

      expect(mockFileSystemUtils.mkdir).toHaveBeenCalledWith('/target');
    });

    it('should throw error when target file already exists', async () => {
      mockFileSystemUtils.exists.mockReturnValue(true);

      const result = await executor.execute(testOperations);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Target file already exists');
    });

    it('should handle multiple operations', async () => {
      const operations = [
        testOperation,
        { ...testOperation, originalPath: '/source/file2.txt', newPath: '/target/file2.txt' }
      ];
      mockFileSystemUtils.exists.mockReturnValue(false);

      const result = await executor.execute(operations);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockFileSystemUtils.rename).toHaveBeenCalledTimes(2);
    });

    it('should continue processing after one operation fails', async () => {
      const operations = [
        testOperation,
        { ...testOperation, originalPath: '/source/file2.txt', newPath: '/target/file2.txt' }
      ];
      mockFileSystemUtils.exists.mockReturnValue(false);
      mockFileSystemUtils.rename
        .mockImplementationOnce(() => {
          throw new Error('File locked');
        })
        .mockImplementationOnce(() => {});

      const result = await executor.execute(operations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('/source/file.txt');
    });

    it('should log successful operation', async () => {
      mockFileSystemUtils.exists.mockReturnValue(false);

      await executor.execute(testOperations);

      expect(loggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.objectContaining({
          from: testOperation.originalPath,
          to: testOperation.newPath
        })
      );
    });

    it('should log failed operation', async () => {
      mockFileSystemUtils.exists.mockReturnValue(false);
      mockFileSystemUtils.rename.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await executor.execute(testOperations);

      expect(loggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining('✗'),
        expect.stringContaining('Permission denied')
      );
    });

    it('should allow rename when target equals original', async () => {
      const samePathOperation = {
        ...testOperation,
        originalPath: '/same/file.txt',
        newPath: '/same/file.txt'
      };
      mockFileSystemUtils.exists.mockReturnValue(true);
      mockFileSystemUtils.mkdir.mockReturnValue(undefined);
      mockFileSystemUtils.rename.mockReturnValue(undefined);

      const result = await executor.execute([samePathOperation]);

      expect(result.successful).toBe(1);
      expect(mockFileSystemUtils.rename).toHaveBeenCalled();
    });
  });
});
