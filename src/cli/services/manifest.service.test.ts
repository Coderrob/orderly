import * as path from 'node:path';

import { ManifestGenerator } from '../../organizer/manifest-generator';
import type { IOrganizationResult } from '../../organizer/types';

import { ManifestService } from './manifest.service';

jest.mock('node:path');
jest.mock('../../organizer/manifest-generator');

describe('ManifestService', () => {
  let service: ManifestService;
  let mockPath: jest.Mocked<typeof path>;
  let mockManifestGenerator: jest.Mocked<ManifestGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPath = path as jest.Mocked<typeof path>;
    mockManifestGenerator = {
      generate: jest.fn(),
      save: jest.fn(),
      saveMarkdown: jest.fn()
    } as unknown as jest.Mocked<ManifestGenerator>;

    (ManifestGenerator as jest.MockedClass<typeof ManifestGenerator>).mockImplementation(
      () => mockManifestGenerator
    );

    service = new ManifestService();
  });

  describe('saveManifests', () => {
    it('should generate and save both JSON and Markdown manifests', () => {
      const result: IOrganizationResult = {
        successful: 5,
        failed: 0,
        errors: [],
        operations: []
      };

      const outputDir = '/output/dir';
      const manifest = {
        generatedAt: '2023-01-01T00:00:00.000Z',
        totalOperations: 5,
        successful: 5,
        failed: 0,
        entries: []
      };

      mockManifestGenerator.generate.mockReturnValue(manifest);
      mockPath.join
        .mockReturnValueOnce('/output/dir/orderly-manifest.json')
        .mockReturnValueOnce('/output/dir/orderly-manifest.md');

      service.saveManifests(result, outputDir);

      expect(mockManifestGenerator.generate).toHaveBeenCalledWith(result, result.errors);
      expect(mockPath.join).toHaveBeenCalledWith(outputDir, 'orderly-manifest.json');
      expect(mockPath.join).toHaveBeenCalledWith(outputDir, 'orderly-manifest.md');
      expect(mockManifestGenerator.save).toHaveBeenCalledWith(
        manifest,
        '/output/dir/orderly-manifest.json'
      );
      expect(mockManifestGenerator.saveMarkdown).toHaveBeenCalledWith(
        manifest,
        '/output/dir/orderly-manifest.md'
      );
    });

    it('should handle result with errors', () => {
      const result: IOrganizationResult = {
        successful: 3,
        failed: 2,
        errors: [{ file: 'test.txt', error: 'Test error' }],
        operations: []
      };

      const outputDir = '/output/dir';
      const manifest = {
        generatedAt: '2023-01-01T00:00:00.000Z',
        totalOperations: 5,
        successful: 3,
        failed: 2,
        entries: []
      };

      mockManifestGenerator.generate.mockReturnValue(manifest);
      mockPath.join
        .mockReturnValueOnce('/output/dir/orderly-manifest.json')
        .mockReturnValueOnce('/output/dir/orderly-manifest.md');

      service.saveManifests(result, outputDir);

      expect(mockManifestGenerator.generate).toHaveBeenCalledWith(result, result.errors);
    });

    it('should create ManifestService instance successfully', () => {
      const newService = new ManifestService();
      expect(newService).toBeDefined();
      expect(newService).toBeInstanceOf(ManifestService);
    });

    it('should call both save and saveMarkdown', () => {
      const result: IOrganizationResult = {
        successful: 5,
        failed: 0,
        errors: [],
        operations: []
      };

      const outputDir = '/output/dir';
      const manifest = {
        generatedAt: '2023-01-01T00:00:00.000Z',
        totalOperations: 5,
        successful: 5,
        failed: 0,
        entries: []
      };

      mockManifestGenerator.generate.mockReturnValue(manifest);
      mockPath.join
        .mockReturnValueOnce('/output/dir/orderly-manifest.json')
        .mockReturnValueOnce('/output/dir/orderly-manifest.md');

      service.saveManifests(result, outputDir);

      expect(mockManifestGenerator.save).toHaveBeenCalledTimes(1);
      expect(mockManifestGenerator.saveMarkdown).toHaveBeenCalledTimes(1);
    });
  });
});
