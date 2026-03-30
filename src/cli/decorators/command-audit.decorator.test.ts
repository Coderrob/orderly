import * as crypto from 'node:crypto';

import { Clock } from '../../utils/clock';
import { createAuditCommandWrapper, WithCommandAudit } from './command-audit.decorator';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn()
}));

jest.mock('../../utils/clock', () => ({
  Clock: {
    nowMonotonicToken: jest.fn()
  }
}));

describe('WithCommandAudit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(crypto.randomUUID).mockReturnValue('12345678-1234-1234-1234-123456789abc');
    jest.mocked(Clock.nowMonotonicToken).mockReturnValue('token-1');
  });

  it('should append an audit run id to an existing message', async () => {
    class TestHandler {
      @WithCommandAudit('test')
      execute(): { exitCode: number; message: string; success: boolean } {
        return { success: true, exitCode: 0, message: 'done' };
      }
    }

    const result = await new TestHandler().execute();

    expect(result.message).toBe('done [run=test-token-1-12345678]');
  });

  it('should create an audit-only message when the original message is empty', async () => {
    class TestHandler {
      @WithCommandAudit('test')
      execute(): { exitCode: number; message: string; success: boolean } {
        return { success: true, exitCode: 0, message: '' };
      }
    }

    const result = await new TestHandler().execute();

    expect(result.message).toBe('[run=test-token-1-12345678]');
  });

  it('should fall back to a failed result when the original return value is invalid', async () => {
    class TestHandler {
      @WithCommandAudit('test')
      execute(): string {
        return 'invalid';
      }
    }

    const result = await new TestHandler().execute();

    expect(result).toEqual({
      success: false,
      exitCode: 1,
      message: '[run=test-token-1-12345678]'
    });
  });

  it('should leave non-callable descriptors unchanged', () => {
    const decorator = WithCommandAudit('test');
    const descriptor: PropertyDescriptor = { configurable: true, value: 42 };

    const result = decorator({}, 'execute', descriptor);

    expect(result).toEqual(descriptor);
  });

  it('should create plain audit wrappers', async () => {
    const wrappedMethod = createAuditCommandWrapper('test')({
      invoke() {
        return { success: true, exitCode: 0, message: 'done' };
      }
    });

    await expect(wrappedMethod.call({})).resolves.toEqual({
      success: true,
      exitCode: 0,
      message: 'done [run=test-token-1-12345678]'
    });
  });
});
