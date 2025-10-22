import { FileOrganizer, FileOperation, OrganizationResult } from './file-organizer';
import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { ScannedFile } from '../scanner/file-scanner';
import { OperationPlanner } from './operation-planner';
import { OperationExecutor } from './operation-executor';

jest.mock('../logger/logger');
jest.mock('./operation-planner');
jest.mock('./operation-executor');

describe('FileOrganizer', () => {
  const mockLogger = Logger as jest.Mocked<typeof Logger>;
  const mockOperationPlanner = OperationPlanner as jest.Mocked<typeof OperationPlanner>;
  const mockOperationExecutor = OperationExecutor as jest.Mocked<typeof OperationExecutor>;

  let organizer: FileOrganizer;
  let loggerInstance: jest.Mocked<Logger>;
  let plannerInstance: jest.Mocked<OperationPlanner>;
  let executorInstance: jest.Mocked<OperationExecutor>;
  let testConfig: OrderlyConfig;
  let testBaseDirectory: string;
  let testFiles: ScannedFile[];
  let testOperations: FileOperation[];

  beforeEach(() => {
    loggerInstance = {
      info: jest.fn()
    } as any;
    plannerInstance = {
      plan: jest.fn()
    } as any;
    executorInstance = {
      execute: jest.fn()
    } as any;
    mockOperationPlanner.mockImplementation(() => plannerInstance);
    mockOperationExecutor.mockImplementation(() => executorInstance);

    testConfig = {
      categories: [],
      namingConvention: { type: 'kebab-case', lowercase: true },
      excludePatterns: [],
      includeHidden: false,
      dryRun: false,
      generateManifest: true,
      logLevel: 'info'
    };
    testBaseDirectory = '/base/dir';
    testFiles = [
      {
        originalPath: '/base/dir/File.txt',
        filename: 'File.txt',
        extension: '.txt',
        size: 100,
        category: 'documents',
        targetFolder: 'documents',
        needsRename: false
      }
    ];
    testOperations = [
      {
        type: 'move',
        originalPath: '/base/dir/File.txt',
        newPath: '/base/dir/documents/File.txt',
        reason: 'Moving to documents'
      }
    ];

    organizer = new FileOrganizer(testConfig, loggerInstance, testBaseDirectory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('planOperations', () => {
    it('should use OperationPlanner to plan operations', () => {
      plannerInstance.plan.mockReturnValue(testOperations);

      const result = organizer.planOperations(testFiles);

      expect(plannerInstance.plan).toHaveBeenCalledWith(testFiles);
      expect(result).toBe(testOperations);
    });

    it('should log planned operations count', () => {
      plannerInstance.plan.mockReturnValue(testOperations);

      organizer.planOperations(testFiles);

      expect(loggerInstance.info).toHaveBeenCalledWith('Planned 1 operations');
    });

    it('should handle empty file list', () => {
      plannerInstance.plan.mockReturnValue([]);

      const result = organizer.planOperations([]);

      expect(result).toHaveLength(0);
      expect(loggerInstance.info).toHaveBeenCalledWith('Planned 0 operations');
    });

    it('should handle multiple operations', () => {
      const multipleOps = [...testOperations, ...testOperations];
      plannerInstance.plan.mockReturnValue(multipleOps);

      const result = organizer.planOperations(testFiles);

      expect(result).toHaveLength(2);
      expect(loggerInstance.info).toHaveBeenCalledWith('Planned 2 operations');
    });
  });

  describe('executeOperations', () => {
    it('should use OperationExecutor to execute operations', async () => {
      const mockResult: OrganizationResult = {
        operations: testOperations,
        successful: 1,
        failed: 0,
        errors: []
      };
      executorInstance.execute.mockResolvedValue(mockResult);

      const result = await organizer.executeOperations(testOperations);

      expect(executorInstance.execute).toHaveBeenCalledWith(testOperations);
      expect(result).toBe(mockResult);
    });

    it('should pass operations to executor', async () => {
      const mockResult: OrganizationResult = {
        operations: testOperations,
        successful: 1,
        failed: 0,
        errors: []
      };
      executorInstance.execute.mockResolvedValue(mockResult);

      await organizer.executeOperations(testOperations);

      expect(executorInstance.execute).toHaveBeenCalledWith(testOperations);
    });

    it('should return result from executor', async () => {
      const expected: OrganizationResult = {
        operations: testOperations,
        successful: 5,
        failed: 2,
        errors: [{ file: '/test', error: 'error' }]
      };
      executorInstance.execute.mockResolvedValue(expected);

      const result = await organizer.executeOperations(testOperations);

      expect(result).toEqual(expected);
    });
  });

  describe('integration', () => {
    it('should orchestrate planning and execution', async () => {
      plannerInstance.plan.mockReturnValue(testOperations);
      const mockResult: OrganizationResult = {
        operations: testOperations,
        successful: 1,
        failed: 0,
        errors: []
      };
      executorInstance.execute.mockResolvedValue(mockResult);

      const operations = organizer.planOperations(testFiles);
      const result = await organizer.executeOperations(operations);

      expect(operations).toBe(testOperations);
      expect(result.successful).toBe(1);
      expect(loggerInstance.info).toHaveBeenCalledWith('Planned 1 operations');
    });
  });
});
