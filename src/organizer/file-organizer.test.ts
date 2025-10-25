import {
  FileOrganizer,
  FileOperation,
  OrganizationResult,
  FileOperationType
} from './file-organizer';
import { OrderlyConfig, NamingConventionType } from '../config/types';
import { Logger } from '../logger/logger';
import { ScannedFile } from '../scanner/file-scanner';
import { OperationPlanner } from './operation-planner';
import { OperationExecutor } from './operation-executor';
import { LogLevel } from '../types';

jest.mock('../logger/logger');
jest.mock('./operation-planner');
jest.mock('./operation-executor');

describe('FileOrganizer', () => {
  let organizer: FileOrganizer;
  let loggerInstance: jest.Mocked<Logger>;
  let plannerInstance: jest.Mocked<OperationPlanner>;
  let executorInstance: {
    execute: jest.MockedFunction<(operations: FileOperation[]) => OrganizationResult>;
  };
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

    const executeMock = jest.fn<OrganizationResult, [FileOperation[]]>();
    executorInstance = {
      execute: executeMock
    };

    jest.mocked(OperationPlanner).mockImplementation(() => plannerInstance);
    jest.mocked(OperationExecutor).mockImplementation(() => executorInstance as any);

    testConfig = {
      categories: [],
      namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
      excludePatterns: [],
      includeHidden: false,
      dryRun: false,
      generateManifest: true,
      logLevel: LogLevel.INFO
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
        type: FileOperationType.MOVE,
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
    it('should use OperationExecutor to execute operations', () => {
      const mockResult: OrganizationResult = {
        operations: testOperations,
        successful: 1,
        failed: 0,
        errors: []
      };
      executorInstance.execute.mockReturnValue(mockResult);

      const result = organizer.executeOperations(testOperations);

      expect(executorInstance.execute).toHaveBeenCalledWith(testOperations);
      expect(result).toBe(mockResult);
    });

    it('should pass operations to executor', () => {
      const mockResult: OrganizationResult = {
        operations: testOperations,
        successful: 1,
        failed: 0,
        errors: []
      };
      executorInstance.execute.mockReturnValue(mockResult);

      organizer.executeOperations(testOperations);

      expect(executorInstance.execute).toHaveBeenCalledWith(testOperations);
    });

    it('should return result from executor', () => {
      const expected: OrganizationResult = {
        operations: testOperations,
        successful: 5,
        failed: 2,
        errors: [{ file: '/test', error: 'error' }]
      };
      executorInstance.execute.mockReturnValue(expected);

      const result = organizer.executeOperations(testOperations);

      expect(result).toEqual(expected);
    });
  });

  describe('integration', () => {
    it('should orchestrate planning and execution', () => {
      plannerInstance.plan.mockReturnValue(testOperations);
      const mockResult: OrganizationResult = {
        operations: testOperations,
        successful: 1,
        failed: 0,
        errors: []
      };
      executorInstance.execute.mockReturnValue(mockResult);

      const operations = organizer.planOperations(testFiles);
      const result = organizer.executeOperations(operations);

      expect(operations).toBe(testOperations);
      expect(result.successful).toBe(1);
      expect(loggerInstance.info).toHaveBeenCalledWith('Planned 1 operations');
    });
  });
});
