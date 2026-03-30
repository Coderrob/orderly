import * as path from 'node:path';

import { createRootCommand } from '../../src/cli/root-command';
import { ExitCode } from '../../src/cli/constants';
import { DedupeAction, DedupeMode } from '../../src/dedupe/types';
import { TestAssertions, TestEnvironmentSetup, createTestConfig } from '../helpers';

interface IRunCliResult {
  readonly logs: readonly string[];
}

describe('Root CLI integration', () => {
  const HASH_STRATEGY = {
    mode: DedupeMode.ANY,
    size: false,
    sha256: true
  } as const;

  let testEnv: TestEnvironmentSetup;
  let testDir: string;
  let logSpy: jest.SpyInstance<void, Parameters<typeof console.log>>;
  let originalExitCode: NodeJS.Process['exitCode'];
  let originalWorkingDirectory: string;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    originalWorkingDirectory = process.cwd();
    testEnv = new TestEnvironmentSetup();
    testDir = testEnv.createTempDir();
    process.exitCode = undefined;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalWorkingDirectory);
    testEnv.cleanup();
    jest.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  it('runs grouped config init through the real CLI parser', async () => {
    const configPath = path.join(testDir, '.orderly.config.json');

    await runCli(['config', 'init', '--format', 'json'], testDir);

    expect(process.exitCode).toBe(ExitCode.SUCCESS);
    TestAssertions.assertFileExists(configPath);
  });

  it('runs grouped files organize and applies parsed options to the filesystem', async () => {
    const configPath = path.join(testDir, '.orderly.config.json');
    testEnv.createFile(
      configPath,
      JSON.stringify(createTestConfig({ dryRun: false, generateManifest: true }), null, 2)
    );
    testEnv.createFile(path.join(testDir, 'Quarterly Report.txt'), 'report');
    testEnv.createFile(path.join(testDir, 'photo.jpg'), 'image');

    const outputDir = path.join(testDir, 'organized');
    const result = await runCli(
      ['files', 'organize', testDir, '--config', configPath, '--output', outputDir],
      testDir
    );

    expect(process.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.logs.join('\n')).toContain('Successfully organized 2 files');
    TestAssertions.assertFileExists(path.join(outputDir, 'documents', 'quarterly-report.txt'));
    TestAssertions.assertFileExists(path.join(outputDir, 'images', 'photo.jpg'));
    TestAssertions.assertFileExists(path.join(testDir, 'orderly-manifest.json'));
  });

  it('runs grouped files scan and reports the scanned file count', async () => {
    testEnv.createFile(path.join(testDir, 'alpha.txt'), 'a');
    testEnv.createFile(path.join(testDir, 'beta.txt'), 'b');

    const result = await runCli(['files', 'scan', testDir, '--format', 'json'], testDir);

    expect(process.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.logs.join('\n')).toContain('Found 2 files');
  });

  it('blocks destructive dedupe replace runs without explicit confirmation through the CLI', async () => {
    const configPath = path.join(testDir, '.orderly.config.json');
    testEnv.createFile(
      configPath,
      JSON.stringify(
        createTestConfig({
          dryRun: false,
          dedupe: {
            enabled: true,
            strategy: HASH_STRATEGY,
            action: DedupeAction.REPLACE
          }
        }),
        null,
        2
      )
    );
    testEnv.createFile(path.join(testDir, 'a.txt'), 'same');
    testEnv.createFile(path.join(testDir, 'b.txt'), 'same');

    const result = await runCli(['files', 'dedupe', testDir, '--config', configPath], testDir);

    expect(process.exitCode).toBe(ExitCode.ERROR);
    expect(result.logs.join('\n')).toContain('--confirm-replace');
  });

  async function runCli(
    args: readonly string[],
    workingDirectory: string
  ): Promise<Readonly<IRunCliResult>> {
    const logs: string[] = [];
    logSpy.mockImplementation((...messages: readonly unknown[]) => {
      logs.push(messages.map(message => String(message)).join(' '));
    });

    const previousDirectory = process.cwd();
    process.chdir(workingDirectory);

    try {
      await createRootCommand().parseAsync(args, { from: 'user' });
    } finally {
      process.chdir(previousDirectory);
    }

    return { logs };
  }
});
