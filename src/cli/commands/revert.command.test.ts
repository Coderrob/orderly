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

  it('should handle malformed manifest payloads as empty manifests', () => {
    jest.mocked(FileSystemUtils.readFileSync).mockReturnValue('{}');

    const manifest = (handler as any).readManifest('/tmp/manifest.json');

    expect(manifest).toEqual({ entries: [] });
  });

  it('should filter only successful entries through the private helper', () => {
    const entries = (handler as any).getSuccessfulEntries([
      { status: 'success', operation: { originalPath: '/a', newPath: '/b' } },
      { status: 'failed', operation: { originalPath: '/c', newPath: '/d' } }
    ]);

    expect(entries).toEqual([
      { status: 'success', operation: { originalPath: '/a', newPath: '/b' } }
    ]);
  });

  it('should count failures when a rename throws', () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(true);
    jest.mocked(FileSystemUtils.renameSync).mockImplementation(() => {
      throw new Error('rename failed');
    });

    const result = (handler as any).revertEntry(
      {
        status: 'success',
        operation: { originalPath: '/source/file.txt', newPath: '/target/file.txt' }
      },
      { dryRun: false }
    );

    expect(result).toEqual({ reverted: 0, skipped: 0, failed: 1 });
  });

  it('should treat non-success manifest entries as skipped by the execute flow', async () => {
    jest.mocked(FileSystemUtils.readFileSync).mockReturnValue(
      JSON.stringify({
        entries: [
          {
            status: 'failed',
            operation: {
              originalPath: '/root/source.txt',
              newPath: '/root/documents/source.txt'
            }
          }
        ]
      })
    );

    const result = await handler.execute({ manifest: '/root/orderly-manifest.json' });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Reverted 0');
    expect(result.message).toContain('skipped 0');
    expect(FileSystemUtils.renameSync).not.toHaveBeenCalled();
  });

  it('should return a failed command result when a revert operation fails during execution', async () => {
    jest.mocked(FileSystemUtils.hasPath).mockReturnValue(true);
    jest.mocked(FileSystemUtils.renameSync).mockImplementation(() => {
      throw new Error('rename failed');
    });

    const result = await handler.execute({ manifest: '/root/orderly-manifest.json' });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('failed 1');
  });
});
