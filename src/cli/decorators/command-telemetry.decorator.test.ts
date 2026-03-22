import { ExitCode } from '../constants';
import { HandleCommandErrors } from './command-error-handler.decorator';
import { WithCommandTelemetry } from './command-telemetry.decorator';

describe('WithCommandTelemetry', () => {
  it('should append execution duration to successful command messages', async () => {
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
});
