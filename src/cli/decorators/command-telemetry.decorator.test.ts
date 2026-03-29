import { ExitCode } from '../constants';
import { HandleCommandErrors } from './command-error-handler.decorator';
import {
  createTelemetryCommandWrapper,
  WithCommandTelemetry
} from './command-telemetry.decorator';

jest.mock('../../utils/clock', () => ({
  Clock: {
    nowMonotonicMs: jest.fn()
  }
}));

describe('WithCommandTelemetry', () => {
  const mockClock = jest.requireMock('../../utils/clock').Clock as {
    nowMonotonicMs: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should append execution duration to successful command messages', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(100).mockReturnValueOnce(125);

    class TestHandler {
      @WithCommandTelemetry('test')
      async execute(): Promise<{ success: boolean; exitCode: number; message: string }> {
        return {
          success: true,
          exitCode: ExitCode.SUCCESS,
          message: 'done'
        };
      }
    }

    const result = await new TestHandler().execute();

    expect(result.success).toBe(true);
    expect(result.message).toContain('done');
    expect(result.message).toContain('test completed in ');
    expect(result.message).toContain('ms');
  });

  it('should also include duration when combined with error normalization', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(50).mockReturnValueOnce(60);

    class TestHandler {
      @WithCommandTelemetry('test')
      @HandleCommandErrors('failed: ')
      async execute(): Promise<{ success: boolean; exitCode: number; message: string }> {
        throw new Error('boom');
      }
    }

    const result = await new TestHandler().execute();

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(ExitCode.ERROR);
    expect(result.message).toContain('failed: boom');
    expect(result.message).toContain('test completed in ');
    expect(result.message).toContain('ms');
  });

  it('should use telemetry-only text when the command result has no message', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(20).mockReturnValueOnce(20);

    class TestHandler {
      @WithCommandTelemetry('test')
      execute(): { success: boolean; exitCode: number; message: string } {
        return {
          success: true,
          exitCode: ExitCode.SUCCESS,
          message: ''
        };
      }
    }

    const result = await new TestHandler().execute();

    expect(result.message).toBe('test completed in 0ms');
  });

  it('should fall back to a failed result when the return value is invalid', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(10).mockReturnValueOnce(15);

    class TestHandler {
      @WithCommandTelemetry('test')
      execute(): string {
        return 'invalid';
      }
    }

    const result = await new TestHandler().execute();

    expect(result).toEqual({
      success: false,
      exitCode: 1,
      message: 'test completed in 5ms'
    });
  });

  it('should leave non-callable descriptors unchanged', () => {
    const decorator = WithCommandTelemetry('test');
    const descriptor: PropertyDescriptor = { configurable: true, value: 42 };

    const result = decorator({}, 'execute', descriptor);

    expect(result).toEqual(descriptor);
  });

  it('should create plain telemetry wrappers', async () => {
    mockClock.nowMonotonicMs.mockReturnValueOnce(30).mockReturnValueOnce(35);
    const wrappedMethod = createTelemetryCommandWrapper('wrapped')({
      invoke() {
        return {
          success: true,
          exitCode: ExitCode.SUCCESS,
          message: 'done'
        };
      }
    });

    await expect(wrappedMethod.call({})).resolves.toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'done (wrapped completed in 5ms)'
    });
  });
});
