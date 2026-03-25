import * as fs from 'node:fs';
import * as path from 'node:path';

import { TestEnvironmentSetup } from '../../__tests__/helpers';
import { EmptyDirectoryCleaner } from './empty-directory-cleaner';

describe('EmptyDirectoryCleaner', () => {
  let testEnv: TestEnvironmentSetup;
  let rootDir: string;
  let cleaner: EmptyDirectoryCleaner;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    rootDir = testEnv.createTempDir();
    cleaner = new EmptyDirectoryCleaner();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  it('should remove empty directories below the root', () => {
    fs.mkdirSync(path.join(rootDir, 'a', 'b'), { recursive: true });
    testEnv.createFile(path.join(rootDir, 'keep', 'file.txt'), 'content');

    const result = cleaner.clean(rootDir, {});

    expect(result.removedDirectories).toBe(2);
    expect(fs.existsSync(path.join(rootDir, 'a'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'keep'))).toBe(true);
  });

  it('should preserve hidden directories by default', () => {
    fs.mkdirSync(path.join(rootDir, '.hidden'), { recursive: true });

    const result = cleaner.clean(rootDir, {});

    expect(result.removedDirectories).toBe(0);
    expect(fs.existsSync(path.join(rootDir, '.hidden'))).toBe(true);
  });

  it('should report dry-run removals without deleting directories', () => {
    fs.mkdirSync(path.join(rootDir, 'empty'), { recursive: true });

    const result = cleaner.clean(rootDir, { dryRun: true });

    expect(result.removedDirectories).toBe(1);
    expect(result.removed[0]).toEqual({ path: path.join(rootDir, 'empty'), dryRun: true });
    expect(fs.existsSync(path.join(rootDir, 'empty'))).toBe(true);
  });

  it('should remove hidden directories when includeHidden is true', () => {
    fs.mkdirSync(path.join(rootDir, '.hidden'), { recursive: true });

    const result = cleaner.clean(rootDir, { includeHidden: true });

    expect(result.removedDirectories).toBe(1);
    expect(fs.existsSync(path.join(rootDir, '.hidden'))).toBe(false);
  });

  it('should remove an empty .orderly directory when explicitly allowed', () => {
    fs.mkdirSync(path.join(rootDir, '.orderly'), { recursive: true });

    const result = cleaner.clean(rootDir, { includeHidden: true, removeOrderlyDir: true });

    expect(result.removedDirectories).toBe(1);
    expect(fs.existsSync(path.join(rootDir, '.orderly'))).toBe(false);
  });

  it('should recognize benign directory race errors', () => {
    const raceError = new Error('gone');
    Reflect.set(raceError, 'code', 'ENOENT');
    const isSkippableDirectoryRace = (
      cleaner as unknown as { isSkippableDirectoryRace: (error: unknown) => boolean }
    ).isSkippableDirectoryRace.bind(cleaner);

    expect(isSkippableDirectoryRace(raceError)).toBe(true);
  });

  it('should reject non-coded errors as non-skippable races', () => {
    const isSkippableDirectoryRace = (
      cleaner as unknown as { isSkippableDirectoryRace: (error: unknown) => boolean }
    ).isSkippableDirectoryRace.bind(cleaner);

    expect(isSkippableDirectoryRace(new Error('plain'))).toBe(false);
  });

  it('should capture non-error failures as structured clean errors', () => {
    const createCleanError = (
      cleaner as unknown as {
        createCleanError: (directory: string, error: unknown) => { error: string; path: string };
      }
    ).createCleanError.bind(cleaner);

    expect(createCleanError('/tmp/test', 'boom')).toEqual({
      path: '/tmp/test',
      error: 'boom'
    });
  });

  it('should treat thrown ENOTEMPTY errors as skipped directory removals', () => {
    const removeDirectoryIfEmpty = (
      cleaner as unknown as {
        isDirectoryEmpty: (directory: string) => boolean;
        removeDirectoryIfEmpty: (directory: string, options: Record<string, boolean>) => unknown;
      }
    ).removeDirectoryIfEmpty.bind(cleaner);
    jest
      .spyOn(
        cleaner as unknown as { isDirectoryEmpty: (directory: string) => boolean },
        'isDirectoryEmpty'
      )
      .mockImplementation(() => {
        const raceError = new Error('not empty');
        Reflect.set(raceError, 'code', 'ENOTEMPTY');
        throw raceError;
      });

    expect(removeDirectoryIfEmpty('/tmp/test', {})).toEqual({ skipped: true });
  });

  it('should insert deeper directories ahead of shallower ones', () => {
    const insertDirectoryByDepth = (
      cleaner as unknown as {
        insertDirectoryByDepth: (
          directories: readonly string[],
          directory: string
        ) => readonly string[];
      }
    ).insertDirectoryByDepth.bind(cleaner);
    const parentDirectory = path.join(rootDir, 'parent');
    const childDirectory = path.join(parentDirectory, 'child');

    expect(insertDirectoryByDepth([parentDirectory], childDirectory)).toEqual([
      childDirectory,
      parentDirectory
    ]);
  });
});
