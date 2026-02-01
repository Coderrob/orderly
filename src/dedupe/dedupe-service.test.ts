import { DedupeService } from './dedupe-service';
import { NameStrategy, SizeStrategy, Sha256Strategy } from './strategies';
import { Sha256Hasher } from './hashers';
import { IScannedFile } from '../scanner/interfaces';
import { DedupeAction } from './types';

describe('DedupeService', () => {
  let service: DedupeService;
  let strategies: any[];
  let mockFiles: IScannedFile[];

  beforeEach(() => {
    // Create mock strategies
    strategies = [new NameStrategy(), new SizeStrategy(), new Sha256Strategy(new Sha256Hasher())];

    service = new DedupeService(strategies);

    // Create mock files
    mockFiles = [
      {
        filename: 'file1.txt',
        extension: '.txt',
        originalPath: '/path/file1.txt',
        size: 100,
        category: 'documents',
        needsRename: false
      },
      {
        filename: 'file2.txt',
        extension: '.txt',
        originalPath: '/path/file2.txt',
        size: 100,
        category: 'documents',
        needsRename: false
      },
      {
        filename: 'file3.txt',
        extension: '.txt',
        originalPath: '/path/file3.txt',
        size: 200,
        category: 'documents',
        needsRename: false
      }
    ] as IScannedFile[];
  });

  describe('constructor', () => {
    it('should store strategies', () => {
      expect((service as any).strategies).toBe(strategies);
    });
  });

  describe('findDuplicates', () => {
    it('should return empty result for no files', async () => {
      const result = await service.findDuplicates([]);

      expect(result.groups).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
      expect(result.totalDuplicates).toBe(0);
      expect(result.strategiesUsed).toHaveLength(0);
    });

    it('should return empty result when no duplicates found', async () => {
      // Mock strategies to return unique keys
      const nameStrategy = strategies[0] as NameStrategy;
      const sizeStrategy = strategies[1] as SizeStrategy;
      const sha256Strategy = strategies[2] as Sha256Strategy;

      jest
        .spyOn(nameStrategy, 'getKey')
        .mockImplementation(async (file: IScannedFile) => file.filename);
      jest
        .spyOn(sizeStrategy, 'getKey')
        .mockImplementation(async (file: IScannedFile) => String(file.size + Math.random()));
      jest
        .spyOn(sha256Strategy, 'getKey')
        .mockImplementation(async (file: IScannedFile) => `hash-${file.filename}`);

      const result = await service.findDuplicates(mockFiles);

      expect(result.groups).toHaveLength(0);
      expect(result.totalFiles).toBe(3);
      expect(result.totalDuplicates).toBe(0);
      expect(result.strategiesUsed).toEqual(['name', 'sha256', 'size']);
    });

    it('should find duplicates by name', async () => {
      // Modify files to have same name but different sizes
      mockFiles[0].filename = 'duplicate.txt';
      mockFiles[0].size = 100;
      mockFiles[1].filename = 'duplicate.txt';
      mockFiles[1].size = 150;
      mockFiles[2].filename = 'unique.txt';
      mockFiles[2].size = 200;

      const result = await service.findDuplicates(mockFiles);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].key).toBe('duplicate.txt');
      expect(result.groups[0].strategy).toBe('name');
      expect(result.groups[0].files).toHaveLength(2);
      expect(result.totalDuplicates).toBe(2);
    });

    it('should find duplicates by size', async () => {
      // Modify files to have same size
      mockFiles[0].size = 500;
      mockFiles[1].size = 500;
      mockFiles[2].size = 300;

      const result = await service.findDuplicates(mockFiles);

      expect(result.groups.some(g => g.strategy === 'size')).toBe(true);
      const sizeGroup = result.groups.find(g => g.strategy === 'size');
      expect(sizeGroup?.key).toBe('500');
      expect(sizeGroup?.files).toHaveLength(2);
    });

    it('should handle multiple strategies finding duplicates', async () => {
      // Setup files with same name and size
      mockFiles[0].filename = 'same.txt';
      mockFiles[0].size = 400;
      mockFiles[1].filename = 'same.txt';
      mockFiles[1].size = 400;
      mockFiles[2].filename = 'different.txt';
      mockFiles[2].size = 500;

      const result = await service.findDuplicates(mockFiles);

      expect(result.groups).toHaveLength(2); // One for name, one for size
      expect(result.groups.some(g => g.strategy === 'name')).toBe(true);
      expect(result.groups.some(g => g.strategy === 'size')).toBe(true);
    });

    it('should sort strategies used alphabetically', async () => {
      const sha256Strategy = strategies[2] as Sha256Strategy;
      jest
        .spyOn(sha256Strategy, 'getKey')
        .mockImplementation(async (file: IScannedFile) => `hash-${file.filename}`);

      const result = await service.findDuplicates(mockFiles);

      expect(result.strategiesUsed).toEqual(['name', 'sha256', 'size']);
    });
  });

  describe('applyAction', () => {
    let mockResult: any;

    beforeEach(() => {
      mockResult = {
        groups: [
          {
            key: 'duplicate.txt',
            strategy: 'name',
            files: [mockFiles[0], mockFiles[1]],
            primary: mockFiles[0]
          }
        ],
        totalFiles: 3,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      };
    });

    describe('SKIP action', () => {
      it('should mark duplicates for removal', async () => {
        const outcome = await service.applyAction(mockResult, DedupeAction.SKIP);

        expect(outcome.action).toBe(DedupeAction.SKIP);
        expect(outcome.skipped).toHaveLength(1); // Only the duplicate, not primary
        expect(outcome.skipped[0]).toBe(mockFiles[1]);
        expect(outcome.replaced).toHaveLength(0);
        expect(outcome.reported).toHaveLength(0);
      });

      it('should handle multiple groups', async () => {
        mockResult.groups.push({
          key: '500',
          strategy: 'size',
          files: [mockFiles[1], mockFiles[2]],
          primary: mockFiles[1]
        });

        const outcome = await service.applyAction(mockResult, DedupeAction.SKIP);

        expect(outcome.skipped).toHaveLength(2); // One from each group
      });
    });

    describe('REPORT action', () => {
      it('should return groups for reporting', async () => {
        const outcome = await service.applyAction(mockResult, DedupeAction.REPORT);

        expect(outcome.action).toBe(DedupeAction.REPORT);
        expect(outcome.skipped).toHaveLength(0);
        expect(outcome.replaced).toHaveLength(0);
        expect(outcome.reported).toHaveLength(1);
        expect(outcome.reported[0]).toBe(mockResult.groups[0]);
      });
    });

    describe('REPLACE action', () => {
      it('should mark duplicates for replacement', async () => {
        const outcome = await service.applyAction(mockResult, DedupeAction.REPLACE);

        expect(outcome.action).toBe(DedupeAction.REPLACE);
        expect(outcome.skipped).toHaveLength(0);
        expect(outcome.replaced).toHaveLength(1);
        expect(outcome.replaced[0]).toBe(mockFiles[1]);
        expect(outcome.reported).toHaveLength(0);
      });
    });

    it('should throw error for unsupported action', async () => {
      await expect(service.applyAction(mockResult, 'invalid' as any)).rejects.toThrow(
        'Unsupported dedupe action: invalid'
      );
    });
  });
});
