import { OperationPlanner } from './operation-planner';
import { OrderlyConfig, NamingConventionType } from '../config/types';
import { ScannedFile } from '../scanner/file-scanner';
import { NamingUtils } from '../utils/naming';
import { FileOperationType } from './file-organizer';

jest.mock('../utils/naming');

describe('OperationPlanner', () => {
  const mockNamingUtils = NamingUtils as jest.Mocked<typeof NamingUtils>;

  let planner: OperationPlanner;
  let testConfig: OrderlyConfig;
  let testBaseDirectory: string;
  let testFile: ScannedFile;

  beforeEach(() => {
    testBaseDirectory = '/base/dir';
    testConfig = {
      categories: [],
      namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
      excludePatterns: [],
      includeHidden: false,
      dryRun: false,
      generateManifest: true,
      logLevel: 'info'
    };
    testFile = {
      originalPath: '/base/dir/TestFile.txt',
      filename: 'TestFile.txt',
      extension: '.txt',
      size: 100,
      category: 'documents',
      targetFolder: 'documents',
      needsRename: false
    };
    planner = new OperationPlanner(testConfig, testBaseDirectory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('plan', () => {
    it('should return empty array when no files need operations', () => {
      const file: ScannedFile = { ...testFile, targetFolder: undefined };
      mockNamingUtils.needsRename.mockReturnValue(false);

      const result = planner.plan([file]);

      expect(result).toHaveLength(0);
    });

    it('should plan move operation when file needs to be moved', () => {
      mockNamingUtils.needsRename.mockReturnValue(false);

      const result = planner.plan([testFile]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(FileOperationType.MOVE);
      expect(result[0].newPath).toContain('documents');
    });

    it('should plan rename operation when file needs to be renamed', () => {
      const file: ScannedFile = { ...testFile, targetFolder: undefined };
      mockNamingUtils.needsRename.mockReturnValue(true);
      mockNamingUtils.applyNamingConvention.mockReturnValue('test-file.txt');

      const result = planner.plan([file]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(FileOperationType.RENAME);
      expect(result[0].newPath).toContain('test-file.txt');
    });

    it('should plan move-rename operation when file needs both', () => {
      mockNamingUtils.needsRename.mockReturnValue(true);
      mockNamingUtils.applyNamingConvention.mockReturnValue('test-file.txt');

      const result = planner.plan([testFile]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(FileOperationType.MOVE_RENAME);
      expect(result[0].reason).toContain('Moving to');
      expect(result[0].reason).toContain('renaming to');
    });

    it('should plan operations for multiple files', () => {
      const files = [
        testFile,
        { ...testFile, originalPath: '/base/dir/File2.txt', filename: 'File2.txt' }
      ];
      mockNamingUtils.needsRename.mockReturnValue(false);

      const result = planner.plan(files);

      expect(result).toHaveLength(2);
    });

    it('should use target directory when configured', () => {
      const configWithTarget = { ...testConfig, targetDirectory: '/output' };
      const plannerWithTarget = new OperationPlanner(configWithTarget, testBaseDirectory);
      mockNamingUtils.needsRename.mockReturnValue(false);

      const result = plannerWithTarget.plan([testFile]);

      // Path separators vary by OS, so normalize for comparison
      const normalizedPath = result[0].newPath.replaceAll('\\', '/');
      expect(normalizedPath).toContain('/output/documents');
    });

    it('should not create operation when new path equals original path', () => {
      const file: ScannedFile = {
        ...testFile,
        originalPath: '/base/dir/documents/test-file.txt',
        filename: 'test-file.txt',
        targetFolder: 'documents'
      };
      mockNamingUtils.needsRename.mockReturnValue(false);

      const result = planner.plan([file]);

      expect(result).toHaveLength(0);
    });
  });
});
