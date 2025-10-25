import { ManifestGenerator, Manifest } from './manifest-generator';
import { OrganizationResult } from './file-organizer';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';
import { ManifestBuilder } from './manifest-builder';
import { ManifestFormatter } from './manifest-formatter';

jest.mock('../logger/logger');
jest.mock('../utils/file-system-utils');
jest.mock('./manifest-builder');
jest.mock('./manifest-formatter');

describe('ManifestGenerator', () => {
  let generator: ManifestGenerator;
  let loggerInstance: jest.Mocked<Logger>;
  let builderInstance: jest.Mocked<ManifestBuilder>;
  let formatterInstance: jest.Mocked<ManifestFormatter>;
  let testResult: OrganizationResult;
  let testErrors: Array<{ file: string; error: string }>;
  let testManifest: Manifest;

  beforeEach(() => {
    loggerInstance = {
      info: jest.fn()
    } as unknown as jest.Mocked<Logger>;
    builderInstance = {
      build: jest.fn()
    } as any;
    formatterInstance = {
      format: jest.fn()
    } as any;

    jest.mocked(ManifestBuilder).mockImplementation(() => builderInstance);
    jest.mocked(ManifestFormatter).mockImplementation(() => formatterInstance);

    testResult = {
      operations: [],
      successful: 1,
      failed: 0,
      errors: []
    };
    testErrors = [];
    testManifest = {
      generatedAt: '2024-01-01T00:00:00.000Z',
      totalOperations: 1,
      successful: 1,
      failed: 0,
      entries: []
    };

    generator = new ManifestGenerator(loggerInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should use ManifestBuilder to build manifest', () => {
      builderInstance.build.mockReturnValue(testManifest);

      const result = generator.generate(testResult, testErrors);

      expect(builderInstance.build).toHaveBeenCalledWith(testResult, testErrors);
      expect(result).toBe(testManifest);
    });
  });

  describe('save', () => {
    it('should save manifest as JSON to specified path', () => {
      const outputPath = '/output/manifest.json';
      const expectedContent = JSON.stringify(testManifest, null, 2);

      generator.save(testManifest, outputPath);

      expect(jest.mocked(FileSystemUtils).writeFileSync).toHaveBeenCalledWith(
        outputPath,
        expectedContent
      );
    });

    it('should log success message after saving', () => {
      const outputPath = '/output/manifest.json';

      generator.save(testManifest, outputPath);

      expect(loggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining(`Manifest saved to: ${outputPath}`)
      );
    });
  });

  describe('saveMarkdown', () => {
    it('should use ManifestFormatter to format manifest', () => {
      const outputPath = '/output/manifest.md';
      const formattedContent = '# Manifest';
      formatterInstance.format.mockReturnValue(formattedContent);

      generator.saveMarkdown(testManifest, outputPath);

      expect(formatterInstance.format).toHaveBeenCalledWith(testManifest);
      expect(jest.mocked(FileSystemUtils).writeFileSync).toHaveBeenCalledWith(
        outputPath,
        formattedContent
      );
    });

    it('should log success message after saving markdown', () => {
      const outputPath = '/output/manifest.md';
      formatterInstance.format.mockReturnValue('# Manifest');

      generator.saveMarkdown(testManifest, outputPath);

      expect(loggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining(`Markdown manifest saved to: ${outputPath}`)
      );
    });
  });
});
