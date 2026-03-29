import * as crypto from 'node:crypto';

import { ExitCode } from '../constants';
import {
  createWrappedAutoConfigCommand,
  createDirectoryOptionsCommandExecutionRef,
  createSingleOptionsCommandExecutionRef,
  createWrappedCommand,
  createWrappedSingleOptionsCommand
} from './command-wrapper.helpers';

jest.mock('../../utils/clock', () => ({
  Clock: {
    nowMonotonicMs: jest.fn(),
    nowMonotonicToken: jest.fn()
  }
}));
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn()
}));

describe('command wrapper helpers', () => {
  const mockClock = jest.requireMock('../../utils/clock').Clock as {
    nowMonotonicMs: jest.Mock;
    nowMonotonicToken: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(crypto.randomUUID).mockReturnValue('12345678-1234-1234-1234-123456789abc');
    mockClock.nowMonotonicToken.mockReturnValue('token-1');
  });

  it('should create a command execution ref for one options object', async () => {
    const executeCore = jest.fn().mockResolvedValue({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'ok'
    });
    const normalizeOptions = jest.fn().mockReturnValue({ config: '/tmp/orderly.yml' });

    const executionRef = createSingleOptionsCommandExecutionRef({
      executeCore,
      normalizeOptions
    });
    const result = await executionRef.invoke.call({}, { config: './orderly.yml' });

    expect(normalizeOptions).toHaveBeenCalledWith({ config: './orderly.yml' });
    expect(executeCore).toHaveBeenCalledWith({ config: '/tmp/orderly.yml' });
    expect(result).toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'ok'
    });
  });

  it('should create a command execution ref for directory and options commands', async () => {
    const executeCore = jest.fn().mockResolvedValue({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'ok'
    });
    const normalizeDirectory = jest.fn().mockReturnValue('/resolved');
    const normalizeOptions = jest.fn().mockReturnValue({ format: 'json' });
    const normalizeContext = jest.fn().mockReturnValue(undefined);
    const resolveContext = jest.fn().mockReturnValue({ targetDir: '/resolved' });

    const executionRef = createDirectoryOptionsCommandExecutionRef({
      executeCore,
      normalizeContext,
      normalizeDirectory,
      normalizeOptions,
      resolveContext
    });
    const result = await executionRef.invoke.call({}, '/input', { format: 'json' });

    expect(normalizeDirectory).toHaveBeenCalledWith('/input');
    expect(normalizeOptions).toHaveBeenCalledWith({ format: 'json' });
    expect(resolveContext).toHaveBeenCalledWith('/resolved', { format: 'json' }, undefined);
    expect(executeCore).toHaveBeenCalledWith('/resolved', { format: 'json' }, {
      targetDir: '/resolved'
    });
    expect(result).toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'ok'
    });
  });

  it('should create a wrapped command with telemetry and error handling', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(10).mockReturnValueOnce(15);
    const execute = createWrappedSingleOptionsCommand<{ readonly manifest: string }>({
      commandName: 'revert',
      errorPrefix: 'Revert failed: ',
      executeCoreRef: {
        invoke() {
          throw new Error('boom');
        }
      }
    });

    await expect(execute({ manifest: '/tmp/manifest.json' })).resolves.toEqual({
      success: false,
      exitCode: ExitCode.ERROR,
      message: 'Revert failed: boom (revert completed in 5ms)'
    });
  });

  it('should create wrapped commands for arbitrary argument lists', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(30).mockReturnValueOnce(32);
    const execute = createWrappedCommand<[string, { readonly format?: string }]>({
      commandName: 'scan',
      errorPrefix: 'Scan failed: ',
      executeCoreRef: {
        invoke(this: object, ...args: readonly unknown[]) {
          void this;
          void args;
          return {
            success: true,
            exitCode: ExitCode.SUCCESS,
            message: 'done'
          };
        }
      }
    });

    await expect(execute('/tmp', { format: 'json' })).resolves.toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'done (scan completed in 2ms)'
    });
  });

  it('should create wrapped auto-config commands for directory handlers', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(40).mockReturnValueOnce(43);
    const executeCore = jest.fn().mockResolvedValue({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'scanned'
    });
    const normalizeDirectory = jest.fn().mockReturnValue('/resolved');
    const normalizeOptions = jest.fn().mockReturnValue({ autoConfig: true });
    const service = {
      configService: {
        findConfigInDirectory: jest.fn().mockReturnValue('/resolved/.orderly.yml')
      },
      directoryValidator: {
        validate: jest.fn().mockReturnValue('/resolved')
      }
    };

    const execute = createWrappedAutoConfigCommand({
      commandName: 'scan',
      errorPrefix: 'Scan failed: ',
      executeCore,
      normalizeDirectory,
      normalizeOptions,
      service
    });

    await expect(execute('/input', { autoConfig: true })).resolves.toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'scanned (scan completed in 3ms)'
    });
    expect(executeCore).toHaveBeenCalledWith(
      '/resolved',
      { autoConfig: true },
      {
        autoDiscoveredConfig: '/resolved/.orderly.yml',
        configOptions: { autoConfig: true, config: '/resolved/.orderly.yml' },
        targetDir: '/resolved'
      }
    );
  });

  it('should optionally append audit metadata after telemetry', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(20).mockReturnValueOnce(25);
    const execute = createWrappedSingleOptionsCommand<{ readonly format?: string }>({
      auditCommandName: 'init',
      commandName: 'init',
      errorPrefix: 'Init failed: ',
      executeCoreRef: {
        invoke() {
          return {
            success: true,
            exitCode: ExitCode.SUCCESS,
            message: 'created'
          };
        }
      }
    });

    await expect(execute({ format: 'json' })).resolves.toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'created (init completed in 5ms) [run=init-token-1-12345678]'
    });
  });
});
