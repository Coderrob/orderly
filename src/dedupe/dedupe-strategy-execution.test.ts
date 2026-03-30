import type { IScannedFile } from '../scanner/interfaces';

import type { IDedupeStrategy } from './interfaces';
import {
  createCandidate,
  createCandidatePromises,
  createStrategyExecutionPromises,
  executeSingleStrategy,
  executeStrategies,
  executeStrategy
} from './dedupe-strategy-execution';

describe('dedupe-strategy-execution', () => {
  const fileA = createScannedFile('/files/a.txt');
  const fileB = createScannedFile('/files/b.txt');

  it('should create a candidate when a strategy returns a key', async () => {
    const strategy = createStrategy(
      'name',
      async () => 'same',
      () => true
    );

    await expect(createCandidate(strategy, fileA)).resolves.toEqual({
      file: fileA,
      key: 'same',
      strategy: 'name'
    });
  });

  it('should return null when a strategy does not produce a key', async () => {
    const strategy = createStrategy(
      'name',
      async () => null,
      () => true
    );

    await expect(createCandidate(strategy, fileA)).resolves.toBeNull();
  });

  it('should create candidate promises for supported files', async () => {
    const strategy = createStrategy(
      'name',
      async file => file.filename,
      () => true
    );

    const results = await Promise.all(createCandidatePromises(strategy, [fileA, fileB]));

    expect(results).toEqual([
      { file: fileA, key: 'a.txt', strategy: 'name' },
      { file: fileB, key: 'b.txt', strategy: 'name' }
    ]);
  });

  it('should execute one strategy and filter unsupported or null-key files', async () => {
    const strategy = createStrategy(
      'name',
      async file => (file.originalPath === fileA.originalPath ? 'same' : null),
      file => file.originalPath === fileA.originalPath
    );

    await expect(executeStrategy(strategy, [fileA, fileB])).resolves.toEqual([
      { file: fileA, key: 'same', strategy: 'name' }
    ]);
  });

  it('should return null for a strategy execution with no candidates', async () => {
    const strategy = createStrategy(
      'name',
      async () => null,
      () => true
    );

    await expect(executeSingleStrategy(strategy, [fileA])).resolves.toBeNull();
  });

  it('should create keyed strategy execution metadata for a successful strategy', async () => {
    const strategy = createStrategy(
      'name',
      async () => 'same',
      () => true
    );

    const result = await executeSingleStrategy(strategy, [fileA, fileB]);

    expect(result?.strategy).toBe('name');
    expect(result?.keysByPath.get(fileA.originalPath)).toBe('same');
    expect(result?.keysByPath.get(fileB.originalPath)).toBe('same');
  });

  it('should create strategy execution promises for all strategies', async () => {
    const strategies = [
      createStrategy(
        'name',
        async () => 'same',
        () => true
      ),
      createStrategy(
        'size',
        async () => '100',
        () => true
      )
    ];

    const results = await Promise.all(createStrategyExecutionPromises(strategies, [fileA]));

    expect(results).toHaveLength(2);
    expect(results[0]?.strategy).toBe('name');
    expect(results[1]?.strategy).toBe('size');
  });

  it('should execute strategies and discard empty strategy outputs', async () => {
    const strategies = [
      createStrategy(
        'name',
        async () => 'same',
        () => true
      ),
      createStrategy(
        'size',
        async () => null,
        () => true
      )
    ];

    const result = await executeStrategies(strategies, [fileA]);

    expect(result).toHaveLength(1);
    expect(result[0].strategy).toBe('name');
  });
});

function createScannedFile(originalPath: string): IScannedFile {
  const pathSegments = originalPath.split('/');
  const filename = pathSegments[pathSegments.length - 1] ?? 'file.txt';

  return {
    originalPath,
    filename,
    extension: '.txt',
    size: 1,
    needsRename: false
  };
}

function createStrategy(
  name: string,
  getKey: (file: Readonly<IScannedFile>) => Promise<string | null>,
  canProcess: (file: Readonly<IScannedFile>) => boolean
): IDedupeStrategy {
  return {
    name,
    priority: 1,
    canProcess,
    getKey
  };
}
