import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import { ConfigValidateHandler } from './config-validate.command';

jest.mock('../../config/config-loader');

describe('ConfigValidateHandler', () => {
  const mockConfigService = {
    findConfigInDirectory: jest.fn()
  };

  let handler: ConfigValidateHandler;

  beforeEach(() => {
    handler = new ConfigValidateHandler(mockConfigService as any);
    jest.clearAllMocks();
  });

  it('should validate an explicit config path', async () => {
    jest.mocked(ConfigLoader.load).mockReturnValue({
      categories: [{ name: 'documents', extensions: ['.txt'] }],
      namingConvention: { type: 'kebab-case' },
      excludePatterns: [],
      includeHidden: false,
      dryRun: false,
      generateManifest: true,
      logLevel: 'info'
    } as any);

    const result = await handler.execute({ config: './orderly.config.json' });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Validated config');
    expect(result.message).toContain('1 categories');
  });

  it('should discover a config in a directory when no explicit path is provided', async () => {
    mockConfigService.findConfigInDirectory.mockReturnValue('/tmp/.orderly.yml');
    jest.mocked(ConfigLoader.load).mockReturnValue({
      categories: [],
      namingConvention: { type: 'kebab-case' },
      excludePatterns: [],
      includeHidden: false,
      dryRun: false,
      generateManifest: true,
      logLevel: 'info'
    } as any);

    const result = await handler.execute({ directory: '/tmp' });

    expect(result.success).toBe(true);
    expect(mockConfigService.findConfigInDirectory).toHaveBeenCalledWith(path.resolve('/tmp'));
  });

  it('should fail when no config file can be found', async () => {
    mockConfigService.findConfigInDirectory.mockReturnValue(null);

    const result = await handler.execute({ directory: '/tmp' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('No config file found');
  });

  it('should resolve an explicit config path through the private helper', () => {
    const result = (handler as any).resolveConfigPath({ config: './orderly.config.json' });

    expect(result).toBe('./orderly.config.json');
  });

  it('should build a validation success message through the private helper', () => {
    const result = (handler as any).createSuccessMessage('/tmp/orderly.config.json', {
      categories: [{ name: 'docs' }, { name: 'images' }]
    });

    expect(result).toContain('/tmp/orderly.config.json');
    expect(result).toContain('2');
  });

  it('should resolve the current working directory when no directory option is supplied', () => {
    const findConfigInDirectory = jest
      .spyOn(process, 'cwd')
      .mockReturnValue('/workspace/current-directory');
    mockConfigService.findConfigInDirectory.mockReturnValue(
      '/workspace/current-directory/.orderly.yml'
    );

    const result = (handler as any).resolveConfigPath({});

    expect(result).toBe('/workspace/current-directory/.orderly.yml');
    findConfigInDirectory.mockRestore();
  });
});
