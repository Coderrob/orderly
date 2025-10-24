import { ManifestFormatter } from './manifest-formatter';
import { Manifest, ManifestEntry, OperationStatus } from './manifest-generator';
import { FileOperation } from './file-organizer';

describe('ManifestFormatter', () => {
  let formatter: ManifestFormatter;
  let testManifest: Manifest;
  let testEntries: ManifestEntry[];

  beforeEach(() => {
    formatter = new ManifestFormatter();
    const testOperation: FileOperation = {
      type: 'move',
      originalPath: '/source/file.txt',
      newPath: '/target/file.txt',
      reason: 'Moving to target'
    };
    testEntries = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        operation: testOperation,
        status: OperationStatus.SUCCESS
      },
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        operation: { ...testOperation, type: 'rename' },
        status: OperationStatus.FAILED,
        error: 'File locked'
      }
    ];
    testManifest = {
      generatedAt: '2024-01-01T00:00:00.000Z',
      totalOperations: 2,
      successful: 1,
      failed: 1,
      entries: testEntries
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('format', () => {
    it('should include manifest header', () => {
      const result = formatter.format(testManifest);

      expect(result).toContain('# Orderly File Organization Manifest');
      expect(result).toContain('**Generated:** 2024-01-01T00:00:00.000Z');
    });

    it('should include operation statistics', () => {
      const result = formatter.format(testManifest);

      expect(result).toContain('**Total Operations:** 2');
      expect(result).toContain('**Successful:** 1');
      expect(result).toContain('**Failed:** 1');
    });

    it('should format successful operation with checkmark', () => {
      const result = formatter.format(testManifest);

      expect(result).toContain('### ✓ MOVE');
      expect(result).toContain('**From:** `/source/file.txt`');
      expect(result).toContain('**To:** `/target/file.txt`');
      expect(result).toContain('**Reason:** Moving to target');
    });

    it('should format failed operation with cross mark', () => {
      const result = formatter.format(testManifest);

      expect(result).toContain('### ✗ RENAME');
      expect(result).toContain('**Error:** File locked');
    });

    it('should format operations section when entries exist', () => {
      const result = formatter.format(testManifest);

      expect(result).toContain('## Operations');
    });

    it('should not include operations section when no entries', () => {
      const emptyManifest: Manifest = {
        ...testManifest,
        entries: [],
        totalOperations: 0
      };

      const result = formatter.format(emptyManifest);

      expect(result).not.toContain('## Operations');
    });

    it.each([
      ['move', 'MOVE'],
      ['rename', 'RENAME'],
      ['move-rename', 'MOVE-RENAME']
    ])('should uppercase operation type %s to %s', (type, expected) => {
      const manifest: Manifest = {
        ...testManifest,
        entries: [
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            operation: {
              type: type as any,
              originalPath: '/source/file.txt',
              newPath: '/target/file.txt',
              reason: 'Test'
            },
            status: OperationStatus.SUCCESS
          }
        ]
      };

      const result = formatter.format(manifest);

      expect(result).toContain(`✓ ${expected}`);
    });

    it('should separate entries with empty lines', () => {
      const result = formatter.format(testManifest);

      const lines = result.split('\n');
      const emptyLines = lines.filter(line => line === '');
      expect(emptyLines.length).toBeGreaterThan(0);
    });

    it('should format paths as code blocks', () => {
      const result = formatter.format(testManifest);

      expect(result).toContain('`/source/file.txt`');
      expect(result).toContain('`/target/file.txt`');
    });
  });
});
