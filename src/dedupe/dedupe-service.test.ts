import { IScannedFile } from '../scanner/interfaces';

import { Sha256Hasher } from './hashers';
import type { IDedupeStrategy } from './interfaces';
import { findPairMatches, isDuplicatePair } from './dedupe-pair-evaluation';
import { NameStrategy, Sha256Strategy, SizeStrategy } from './strategies';
import { DedupeAction, DedupeMode } from './types';
import { DedupeService } from './dedupe-service';

describe('DedupeService', () => {
  let service: DedupeService;
  let strategies: IDedupeStrategy[];
  let mockFiles: IScannedFile[];

  beforeEach(() => {
    strategies = [new NameStrategy(), new SizeStrategy(), new Sha256Strategy(new Sha256Hasher())];
    service = new DedupeService(strategies);

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
      expect((service as unknown as { strategies: readonly IDedupeStrategy[] }).strategies).toBe(
        strategies
      );
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
      const nameStrategy = strategies[0] as NameStrategy;
      const sizeStrategy = strategies[1] as SizeStrategy;
      const sha256Strategy = strategies[2] as Sha256Strategy;

      jest
        .spyOn(nameStrategy, 'getKey')
        .mockImplementation(async (file: IScannedFile) => file.filename);
      jest
        .spyOn(sizeStrategy, 'getKey')
        .mockImplementation(async (file: IScannedFile) => `${file.size}-${file.filename}`);
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
      mockFiles[0].size = 500;
      mockFiles[1].size = 500;
      mockFiles[2].size = 300;

      const result = await service.findDuplicates(mockFiles);

      expect(result.groups.some(group => group.strategy === 'size')).toBe(true);
      const sizeGroup = result.groups.find(group => group.strategy === 'size');
      expect(sizeGroup?.key).toBe('500');
      expect(sizeGroup?.files).toHaveLength(2);
    });

    it('should merge duplicate pairs that match across multiple strategies in ANY mode', async () => {
      mockFiles[0].filename = 'same.txt';
      mockFiles[0].size = 400;
      mockFiles[1].filename = 'same.txt';
      mockFiles[1].size = 400;
      mockFiles[2].filename = 'different.txt';
      mockFiles[2].size = 500;

      const result = await service.findDuplicates(mockFiles);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].files).toEqual([mockFiles[0], mockFiles[1]]);
      expect(result.groups[0].strategies).toEqual(expect.arrayContaining(['name', 'size']));
    });

    it('should require all applicable strategies to match in ALL mode', async () => {
      const sizeOnly = {
        name: 'size',
        priority: 1,
        canProcess: jest.fn().mockReturnValue(true),
        getKey: jest
          .fn()
          .mockImplementation(async (file: IScannedFile) =>
            file.size === 100 ? 'same-size' : file.size.toString()
          )
      } satisfies IDedupeStrategy;
      const hashOnly = {
        name: 'sha256',
        priority: 2,
        canProcess: jest.fn().mockReturnValue(true),
        getKey: jest.fn().mockImplementation(async (file: IScannedFile) => `hash-${file.filename}`)
      } satisfies IDedupeStrategy;

      const allModeService = new DedupeService([sizeOnly, hashOnly], DedupeMode.ALL);
      const result = await allModeService.findDuplicates(mockFiles);

      expect(result.groups).toHaveLength(0);
    });

    it('should ignore unsupported strategies when evaluating ALL mode', async () => {
      const nameStrategy = {
        name: 'name',
        priority: 1,
        canProcess: jest.fn().mockReturnValue(true),
        getKey: jest.fn().mockResolvedValue('duplicate')
      } satisfies IDedupeStrategy;
      const imageOnlyStrategy = {
        name: 'image-dimensions',
        priority: 2,
        canProcess: jest.fn().mockReturnValue(false),
        getKey: jest.fn()
      } satisfies IDedupeStrategy;

      const allModeService = new DedupeService([nameStrategy, imageOnlyStrategy], DedupeMode.ALL);
      const result = await allModeService.findDuplicates(mockFiles.slice(0, 2));

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].files).toEqual([mockFiles[0], mockFiles[1]]);
      expect(result.groups[0].strategy).toBe('name');
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
    let mockResult: {
      groups: Array<{
        key: string;
        strategy: string;
        files: IScannedFile[];
        primary: IScannedFile;
      }>;
      totalFiles: number;
      totalDuplicates: number;
      strategiesUsed: string[];
    };

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
        expect(outcome.skipped).toHaveLength(1);
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

        expect(outcome.skipped).toHaveLength(2);
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
      await expect(service.applyAction(mockResult, 'invalid' as never)).rejects.toThrow(
        'Unsupported dedupe action: invalid'
      );
    });
  });

  describe('private methods', () => {
    it('should treat ANY mode as non-duplicate when no strategies matched', () => {
      expect(isDuplicatePair([], 2, DedupeMode.ANY)).toBe(false);
    });

    it('should skip pair matches when either file is missing a strategy key', () => {
      const result = findPairMatches('/left', '/right', [
        {
          strategy: 'name',
          keysByPath: new Map([['/left', 'same']])
        }
      ]);

      expect(result).toEqual({ applicableStrategies: 0, matched: [] });
    });

    it('should not union indexes already in the same set', () => {
      const parents = [0, 0, 2];

      const result = service['union'](parents, 0, 1);

      expect(result).toEqual([0, 0, 2]);
      expect(parents).toEqual([0, 0, 2]);
    });
  });
});
