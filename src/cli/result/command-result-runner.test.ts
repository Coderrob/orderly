import {
  createCommandAction,
  createDirectoryCommandAction,
  runCommandResult
} from './command-result-runner';

describe('command-result-runner', () => {
  let originalExitCode: typeof process.exitCode;
  let originalLog: typeof console.log;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    originalLog = console.log;
    console.log = jest.fn();
    Reflect.set(process, 'exitCode', undefined);
  });

  afterEach(() => {
    console.log = originalLog;
    Reflect.set(process, 'exitCode', originalExitCode);
  });

  it('should print message and apply exit code when running a command result', async () => {
    await runCommandResult(async () => ({
      success: true,
      exitCode: 0,
      message: 'done'
    }));

    expect(console.log).toHaveBeenCalledWith('done');
    expect(process.exitCode).toBe(0);
  });

  it('should not print when a command result has no message', async () => {
    await runCommandResult(async () => ({
      success: true,
      exitCode: 1
    }));

    expect(console.log).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('should execute non-directory command actions', async () => {
    const handler = jest.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      message: 'init ok'
    });

    await createCommandAction(handler)({ format: 'yaml' });

    expect(handler).toHaveBeenCalledWith({ format: 'yaml' });
    expect(console.log).toHaveBeenCalledWith('init ok');
  });

  it('should execute directory command actions', async () => {
    const handler = jest.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      message: 'scan ok'
    });

    await createDirectoryCommandAction(handler)('/tmp/files', { dryRun: true });

    expect(handler).toHaveBeenCalledWith('/tmp/files', { dryRun: true });
    expect(console.log).toHaveBeenCalledWith('scan ok');
  });
});
