import { ExitCode } from '../constants';
import { HandleCommandErrors } from './command-error-handler.decorator';

describe('HandleCommandErrors', () => {
  it('should convert synchronous errors into a failed command result', async () => {
    class TestHandler {
      @HandleCommandErrors('Sync failed: ')
      execute(): { success: boolean; exitCode: number; message: string } {
        throw new Error('boom');
      }
    }

    const result = await Promise.resolve(new TestHandler().execute());

    expect(result).toEqual({
      success: false,
      exitCode: ExitCode.ERROR,
      message: 'Sync failed: boom'
    });
  });

  it('should convert async non-Error failures into a failed command result', async () => {
    class TestHandler {
      @HandleCommandErrors('Async failed: ')
      async execute(): Promise<{ success: boolean; exitCode: number; message: string }> {
        throw 'boom';
      }
    }

    const result = await new TestHandler().execute();

    expect(result).toEqual({
      success: false,
      exitCode: ExitCode.ERROR,
      message: 'Async failed: boom'
    });
  });

  it('should preserve successful command results', async () => {
    class TestHandler {
      @HandleCommandErrors('Should not be used: ')
      async execute(): Promise<{ success: boolean; exitCode: number; message: string }> {
        return {
          success: true,
          exitCode: ExitCode.SUCCESS,
          message: 'ok'
        };
      }
    }

    await expect(new TestHandler().execute()).resolves.toEqual({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: 'ok'
    });
  });
});
