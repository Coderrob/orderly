import { ManifestBuilder } from './manifest-builder';
import { FileOperation, OrganizationResult, FileOperationType } from './file-organizer';

describe('ManifestBuilder', () => {
  let builder: ManifestBuilder;
  let testResult: OrganizationResult;
  let testErrors: Array<{ file: string; error: string }>;
  let testOperations: FileOperation[];

  beforeEach(() => {
    builder = new ManifestBuilder();
    testOperations = [
      {
        type: FileOperationType.MOVE,
        originalPath: '/source/file1.txt',
        newPath: '/target/file1.txt',
        reason: 'Moving to target'
      },
      {
        type: FileOperationType.RENAME,
        originalPath: '/source/File2.txt',
        newPath: '/source/file-2.txt',
        reason: 'Renaming to kebab-case'
      }
    ];
    testErrors = [{ file: '/source/file1.txt', error: 'File locked' }];
    testResult = {
      operations: testOperations,
      successful: 1,
      failed: 1,
      errors: testErrors
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('build', () => {
    it('should build manifest with correct metadata', () => {
      const manifest = builder.build(testResult, testErrors);

      expect(manifest.totalOperations).toBe(2);
      expect(manifest.successful).toBe(1);
      expect(manifest.failed).toBe(1);
      expect(manifest.generatedAt).toBeDefined();
      expect(new Date(manifest.generatedAt)).toBeInstanceOf(Date);
    });

    it('should create entries for all operations', () => {
      const manifest = builder.build(testResult, testErrors);

      expect(manifest.entries).toHaveLength(2);
    });

    it('should mark failed operations correctly', () => {
      const manifest = builder.build(testResult, testErrors);

      const failedEntry = manifest.entries.find(
        e => e.operation.originalPath === '/source/file1.txt'
      );
      expect(failedEntry?.status).toBe('failed');
      expect(failedEntry?.error).toBe('File locked');
    });

    it('should mark successful operations correctly', () => {
      const manifest = builder.build(testResult, testErrors);

      const successEntry = manifest.entries.find(
        e => e.operation.originalPath === '/source/File2.txt'
      );
      expect(successEntry?.status).toBe('success');
      expect(successEntry?.error).toBeUndefined();
    });

    it('should include operation details in entries', () => {
      const manifest = builder.build(testResult, testErrors);

      expect(manifest.entries[0].operation).toEqual(testOperations[0]);
      expect(manifest.entries[1].operation).toEqual(testOperations[1]);
    });

    it('should use same timestamp for all entries', () => {
      const manifest = builder.build(testResult, testErrors);

      const timestamps = manifest.entries.map(e => e.timestamp);
      expect(timestamps.every(t => t === timestamps[0])).toBe(true);
    });

    it('should handle empty operations', () => {
      const emptyResult: OrganizationResult = {
        operations: [],
        successful: 0,
        failed: 0,
        errors: []
      };

      const manifest = builder.build(emptyResult, []);

      expect(manifest.totalOperations).toBe(0);
      expect(manifest.entries).toHaveLength(0);
    });

    it('should handle all successful operations', () => {
      const successResult: OrganizationResult = {
        operations: testOperations,
        successful: 2,
        failed: 0,
        errors: []
      };

      const manifest = builder.build(successResult, []);

      expect(manifest.successful).toBe(2);
      expect(manifest.failed).toBe(0);
      expect(manifest.entries.every(e => e.status === 'success')).toBe(true);
    });
  });
});
