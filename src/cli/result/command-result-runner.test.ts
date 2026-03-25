import {
  createCommandAction,
  createDirectoryCommandAction,
  runCommandResult
} from './command-result-runner';

describe('command-result-runner', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('should run a non-directory command action', async () => {
    const handler = jest.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      message: 'done'
    });

    await createCommandAction(handler)({ dryRun: true });

    expect(handler).toHaveBeenCalledWith({ dryRun: true });
    expect(consoleLogSpy).toHaveBeenCalledWith('done');
    expect(process.exitCode).toBe(0);
  });

  it('should run a directory command action', async () => {
    const handler = jest.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      message: 'directory'
    });

    await createDirectoryCommandAction(handler)('/target', { dryRun: false });

    expect(handler).toHaveBeenCalledWith('/target', { dryRun: false });
    expect(consoleLogSpy).toHaveBeenCalledWith('directory');
  });

  it('should skip logging when the result has no message', async () => {
    await runCommandResult(async () => ({
      success: true,
      exitCode: 1
    }));

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
