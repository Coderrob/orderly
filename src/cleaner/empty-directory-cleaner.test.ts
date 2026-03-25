import * as fs from 'node:fs';
import * as path from 'node:path';

import { TestEnvironmentSetup } from '../../__tests__/helpers/test-env-setup';

import { EmptyDirectoryCleaner } from './empty-directory-cleaner';

describe('EmptyDirectoryCleaner', () => {
  let cleaner: EmptyDirectoryCleaner;
  let testEnv: TestEnvironmentSetup;
  let rootDirectory: string;

  beforeEach(() => {
    cleaner = new EmptyDirectoryCleaner();
    testEnv = new TestEnvironmentSetup();
    rootDirectory = testEnv.createTempDir();
  });

  afterEach(() => {
    testEnv.cleanup();
    jest.restoreAllMocks();
  });

  it('should remove nested empty directories bottom-up', () => {
    const emptyLeaf = path.join(rootDirectory, 'a', 'b');
    fs.mkdirSync(emptyLeaf, { recursive: true });

    const result = cleaner.clean(rootDirectory, {});

    expect(result.removedDirectories).toBe(2);
    expect(result.scannedDirectories).toBe(2);
    expect(fs.existsSync(path.join(rootDirectory, 'a'))).toBe(false);
    expect(fs.existsSync(emptyLeaf)).toBe(false);
    expect(fs.existsSync(rootDirectory)).toBe(true);
  });

  it('should preserve non-empty directories', () => {
    testEnv.createFile(path.join(rootDirectory, 'docs', 'readme.txt'), 'content');

    const result = cleaner.clean(rootDirectory, {});

    expect(result.removedDirectories).toBe(0);
    expect(result.skippedDirectories).toBe(1);
    expect(fs.existsSync(path.join(rootDirectory, 'docs'))).toBe(true);
  });

  it('should skip hidden directories by default', () => {
    fs.mkdirSync(path.join(rootDirectory, '.cache'), { recursive: true });

    const result = cleaner.clean(rootDirectory, {});

    expect(result.scannedDirectories).toBe(0);
    expect(result.removedDirectories).toBe(0);
    expect(fs.existsSync(path.join(rootDirectory, '.cache'))).toBe(true);
  });

  it('should remove hidden directories when enabled', () => {
    fs.mkdirSync(path.join(rootDirectory, '.cache'), { recursive: true });

    const result = cleaner.clean(rootDirectory, { includeHidden: true });

    expect(result.removedDirectories).toBe(1);
    expect(fs.existsSync(path.join(rootDirectory, '.cache'))).toBe(false);
  });

  it('should preserve .orderly by default', () => {
    fs.mkdirSync(path.join(rootDirectory, '.orderly'), { recursive: true });

    const result = cleaner.clean(rootDirectory, { includeHidden: true });

    expect(result.removedDirectories).toBe(0);
    expect(fs.existsSync(path.join(rootDirectory, '.orderly'))).toBe(true);
  });

  it('should remove .orderly when explicitly enabled', () => {
    fs.mkdirSync(path.join(rootDirectory, '.orderly'), { recursive: true });

    const result = cleaner.clean(rootDirectory, {
      includeHidden: true,
      removeOrderlyDir: true
    });

    expect(result.removedDirectories).toBe(1);
    expect(fs.existsSync(path.join(rootDirectory, '.orderly'))).toBe(false);
  });

  it('should report dry-run removals without deleting directories', () => {
    fs.mkdirSync(path.join(rootDirectory, 'empty'), { recursive: true });

    const result = cleaner.clean(rootDirectory, { dryRun: true });

    expect(result.removedDirectories).toBe(1);
    expect(result.removed[0]).toEqual({
      path: path.join(rootDirectory, 'empty'),
      dryRun: true
    });
    expect(fs.existsSync(path.join(rootDirectory, 'empty'))).toBe(true);
  });

  it('should report non-benign directory removal failures as errors', () => {
    const emptyDirectory = path.join(rootDirectory, 'empty');
    const permissionError = new Error('permission denied');
    fs.mkdirSync(emptyDirectory, { recursive: true });
    jest.spyOn(cleaner as never, 'isDirectoryEmpty').mockImplementation(() => {
      throw permissionError;
    });

    const result = cleaner.clean(rootDirectory, {});

    expect(result.removedDirectories).toBe(0);
    expect(result.skippedDirectories).toBe(0);
    expect(result.errors).toEqual([{ path: emptyDirectory, error: 'permission denied' }]);
    expect(fs.existsSync(emptyDirectory)).toBe(true);
  });

  it('should create clean errors from non-Error values', () => {
    expect((cleaner as any).createCleanError('/tmp/root', 'boom')).toEqual({
      path: '/tmp/root',
      error: 'boom'
    });
  });

  it('should recognize skippable directory race errors', () => {
    expect((cleaner as any).isSkippableDirectoryRace({ code: 'ENOENT' })).toBe(false);
    expect(
      (cleaner as any).isSkippableDirectoryRace(
        Object.assign(new Error('gone'), { code: 'ENOENT' })
      )
    ).toBe(true);
    expect(
      (cleaner as any).isSkippableDirectoryRace(
        Object.assign(new Error('busy'), { code: 'ENOTEMPTY' })
      )
    ).toBe(true);
    expect((cleaner as any).isSkippableDirectoryRace(new Error('other'))).toBe(false);
  });

  it('should insert deeper directories before shallower directories when sorting', () => {
    const directories = [path.join(rootDirectory, 'a'), path.join(rootDirectory, 'a', 'b')];

    const sorted = (cleaner as any).sortDirectoriesByDepthDescending(directories);

    expect(sorted).toEqual([path.join(rootDirectory, 'a', 'b'), path.join(rootDirectory, 'a')]);
  });
});
