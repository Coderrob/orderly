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
      expect(result.message).toContain('Created configuration file');
      expect(mockConfigLoader.save).toHaveBeenCalledWith(DEFAULT_CONFIG, '.orderly.config.json');
    });

    it('should return error when config file already exists', async () => {
      mockConfigLoader.load.mockReturnValue(DEFAULT_CONFIG);

      const result = await handler.execute({ format: 'json' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Configuration file already exists');
    });

    it('should handle yaml format', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({ format: 'yaml' });

      expect(mockConfigLoader.save).toHaveBeenCalledWith(DEFAULT_CONFIG, '.orderly.config.yaml');
    });

    it('should default to json format', async () => {
      mockConfigLoader.load.mockImplementation(() => {
        throw new Error('Config not found');
      });
      mockConfigLoader.save.mockImplementation(() => {});

      await handler.execute({});

      expect(mockConfigLoader.save).toHaveBeenCalledWith(DEFAULT_CONFIG, '.orderly.config.json');
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

    describe('configExists', () => {
      it('should return true when config exists', () => {
        mockConfigLoader.load.mockReturnValue(DEFAULT_CONFIG);

        const result = (handler as any).configExists('test.json');

        expect(result).toBe(true);
        expect(mockConfigLoader.load).toHaveBeenCalledWith('test.json');
      });

      it('should return false when config does not exist', () => {
        mockConfigLoader.load.mockImplementation(() => {
          throw new Error('Not found');
        });

        const result = (handler as any).configExists('test.json');

        expect(result).toBe(false);
        expect(mockConfigLoader.load).toHaveBeenCalledWith('test.json');
      });
    });
  });
});
