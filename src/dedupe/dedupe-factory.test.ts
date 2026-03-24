import { DedupeService } from './dedupe-service';
import { DedupeStrategyFactory } from './dedupe-factory';
import { DedupeMode, type IDedupeStrategyConfig } from './types';

describe('DedupeStrategyFactory', () => {
  describe('createDefaultStrategies', () => {
    it('should include default strategies when no config is provided', () => {
      const strategies = DedupeStrategyFactory.createDefaultStrategies();

      expect(strategies.map(strategy => strategy.name)).toEqual(['size', 'name', 'sha256']);
    });

    it('should respect size and sha256 toggles', () => {
      const config: IDedupeStrategyConfig = {
        mode: DedupeMode.ANY,
        size: false,
        sha256: false
      };

      const strategies = DedupeStrategyFactory.createDefaultStrategies(config);

      expect(strategies.map(strategy => strategy.name)).toEqual(['name']);
    });

    it('should include optional metadata strategies when enabled', () => {
      const config: IDedupeStrategyConfig = {
        mode: DedupeMode.ANY,
        imageDimensions: true,
        exif: true,
        fileProperties: true,
        fileAttributes: true
      };

      const strategies = DedupeStrategyFactory.createDefaultStrategies(config);
      const names = strategies.map(strategy => strategy.name);

      expect(names).toEqual([
        'size',
        'name',
        'exif',
        'image-dimensions',
        'file-properties',
        'file-attributes',
        'sha256'
      ]);
    });

    it('should pass name options to NameStrategy', async () => {
      const config: IDedupeStrategyConfig = {
        mode: DedupeMode.ANY,
        name: {
          caseSensitive: true,
          ignoreExtension: true
        }
      };

      const strategies = DedupeStrategyFactory.createDefaultStrategies(config);
      const nameStrategy = strategies.find(strategy => strategy.name === 'name');

      expect(nameStrategy).toBeDefined();

      const key = await nameStrategy!.getKey({
        filename: 'Report.TXT',
        extension: '.TXT',
        originalPath: '/tmp/Report.TXT',
        size: 10,
        category: 'documents',
        needsRename: false
      });

      expect(key).toBe('Report');
    });
  });

  describe('createDedupeService', () => {
    it('should create service in configured mode', () => {
      const service = DedupeStrategyFactory.createDedupeService({
        strategy: {
          mode: DedupeMode.ALL,
          size: true,
          sha256: false
        }
      });

      const internal = service as unknown as {
        mode: DedupeMode;
        strategies: Array<{ name: string }>;
      };

      expect(internal.mode).toBe(DedupeMode.ALL);
      expect(internal.strategies.map(strategy => strategy.name)).toEqual(['size', 'name']);
    });

    it('should default to ANY mode for invalid legacy strategy values', () => {
      const service = DedupeStrategyFactory.createDedupeService({
        strategy: 'hash' as unknown as IDedupeStrategyConfig
      });

      expect(service).toBeInstanceOf(DedupeService);

      const internal = service as unknown as { mode: DedupeMode };
      expect(internal.mode).toBe(DedupeMode.ANY);
    });
  });
});
