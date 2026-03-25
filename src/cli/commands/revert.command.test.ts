import { FileSystemUtils } from '../../utils/file-system-utils';
import { RevertHandler } from './revert.command';

jest.mock('../../utils/file-system-utils', () => ({
  FileSystemUtils: {
    hasPath: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    renameSync: jest.fn()
  }
}));

describe('RevertHandler', () => {
  let handler: RevertHandler;

  beforeEach(() => {
    handler = new RevertHandler();
    jest.clearAllMocks();
    jest.mocked(FileSystemUtils.readFileSync).mockReturnValue(
      JSON.stringify({
        entries: [
          {
            status: 'success',
            operation: {
              originalPath: '/root/source.txt',
              newPath: '/root/documents/source.txt'
            }
          }
        ]
      })
    );
  });

  it('should revert successful manifest entries', async () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(true);

    const result = await handler.execute({ manifest: '/root/orderly-manifest.json' });

    expect(result.success).toBe(true);
    expect(FileSystemUtils.renameSync).toHaveBeenCalledWith(
      '/root/documents/source.txt',
      '/root/source.txt'
    );
  });

  it('should support dry-run mode', async () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(true);

    const result = await handler.execute({ manifest: '/root/orderly-manifest.json', dryRun: true });

    expect(result.success).toBe(true);
    expect(FileSystemUtils.renameSync).not.toHaveBeenCalled();
  });

  it('should skip missing destination files', async () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(false);

    const result = await handler.execute({ manifest: '/root/orderly-manifest.json' });

    expect(result.success).toBe(true);
    expect(result.message).toContain('skipped 1');
  });
});
