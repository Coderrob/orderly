import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import { DEFAULT_CONFIG } from '../../config/types';
import { InitHandler } from './init.command';

jest.mock('../../config/config-loader');
jest.mock('node:path');

describe('InitHandler', () => {
  const mockConfigLoader = ConfigLoader as jest.Mocked<typeof ConfigLoader>;
  const mockPath = path as jest.Mocked<typeof path>;

  let handler: InitHandler;

  beforeEach(() => {
    handler = new InitHandler();
    jest.clearAllMocks();
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
  });

  describe('execute', () => {
    it('should create config file when it does not exist', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      const result = await handler.execute({ format: 'json' });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Created downloads configuration file');
      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DEFAULT_CONFIG,
          dedupe: expect.objectContaining({ enabled: false, action: 'skip' })
        }),
        '.orderly.config.json'
      );
    });

    it('should return error when config file already exists', async () => {
      mockConfigLoader.load.mockReturnValue(DEFAULT_CONFIG);

      const result = await handler.execute({ format: 'json' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Configuration file already exists');
      expect(mockConfigLoader.save).not.toHaveBeenCalled();
    });

    it('should handle yaml format', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({ format: 'yaml' });

      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DEFAULT_CONFIG,
          dedupe: expect.objectContaining({ enabled: false, action: 'skip' })
        }),
        '.orderly.config.yaml'
      );
    });

    it('should create a media-library template when requested', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({ format: 'json', template: 'media-library' });

      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: expect.arrayContaining([
            expect.objectContaining({ name: 'photos' }),
            expect.objectContaining({ name: 'videos' })
          ])
        }),
        '.orderly.config.json'
      );
    });

    it('should create a developer-workspace template when requested', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({ format: 'json', template: 'developer-workspace' });

      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: expect.arrayContaining([
            expect.objectContaining({ name: 'code', targetFolder: 'code' }),
            expect.objectContaining({ name: 'documents', targetFolder: 'docs' })
          ])
        }),
        '.orderly.config.json'
      );
    });

    it('should create a photos-only template when requested', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({ format: 'json', template: 'photos-only' });

      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: [expect.objectContaining({ name: 'photos', targetFolder: 'photos' })],
          dedupe: expect.objectContaining({
            enabled: true,
            action: 'report',
            strategy: expect.objectContaining({ imageDimensions: true, exif: true })
          })
        }),
        '.orderly.config.json'
      );
    });

    it('should default to yaml format', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({});

      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DEFAULT_CONFIG,
          dedupe: expect.objectContaining({ enabled: false, action: 'skip' })
        }),
        '.orderly.config.yaml'
      );
    });

    it('should fall back to the downloads template for unknown templates', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({ format: 'json', template: 'unknown-template' });

      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: DEFAULT_CONFIG.categories,
          dedupe: expect.objectContaining({ enabled: false, action: 'skip' })
        }),
        '.orderly.config.json'
      );
    });

    it('should handle save error', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const result = await handler.execute({ format: 'json' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Init failed: Save failed');
    });

    it('should handle non-Error save failure', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const result = await handler.execute({ format: 'json' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Init failed: Save failed');
    });

    it('should return error when config exists via hasExistingConfig branch', async () => {
      const configExistsSpy = jest
        .spyOn(
          handler as unknown as { hasExistingConfig: (configPath: string) => boolean },
          'hasExistingConfig'
        )
        .mockReturnValue(true);

      const result = await handler.execute({ format: 'json' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Configuration file already exists');
      expect(mockConfigLoader.save).not.toHaveBeenCalled();
      expect(configExistsSpy).toHaveBeenCalledWith('.orderly.config.json');

      configExistsSpy.mockRestore();
    });
  });

  describe('private methods', () => {
    describe('getConfigPath', () => {
      it('should return yaml path for yaml format', () => {
        const result = (handler as any).getConfigPath('yaml');
        expect(result).toBe('.orderly.config.yaml');
      });

      it('should return json path for json format', () => {
        const result = (handler as any).getConfigPath('json');
        expect(result).toBe('.orderly.config.json');
      });

      it('should default to json for unknown format', () => {
        const result = (handler as any).getConfigPath('unknown');
        expect(result).toBe('.orderly.config.json');
      });
    });

    describe('hasExistingConfig', () => {
      it('should return true when config exists', () => {
        mockConfigLoader.load.mockReturnValue(DEFAULT_CONFIG);

        const result = (handler as any).hasExistingConfig('test.json');

        expect(result).toBe(true);
        expect(mockConfigLoader.load).toHaveBeenCalledWith('test.json');
      });

      it('should return false when config does not exist', () => {
        mockConfigLoader.load.mockImplementation(() => {
          throw new Error('Not found');
        });

        const result = (handler as any).hasExistingConfig('test.json');

        expect(result).toBe(false);
        expect(mockConfigLoader.load).toHaveBeenCalledWith('test.json');
      });
    });
  });
});
