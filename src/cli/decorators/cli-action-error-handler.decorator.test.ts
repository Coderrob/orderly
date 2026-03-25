import { HandleCliActionErrors } from './cli-action-error-handler.decorator';

describe('HandleCliActionErrors', () => {
  it('should route synchronous errors to handleError', async () => {
    const handleError = jest.fn();

    class TestService {
      public handleError = handleError;

      @HandleCliActionErrors()
      execute(): void {
        throw new Error('sync boom');
      }
    }

    await Promise.resolve(new TestService().execute());

    expect(handleError).toHaveBeenCalledWith(new Error('sync boom'));
  });

  it('should route async errors to handleError', async () => {
    const handleError = jest.fn();

    class TestService {
      public handleError = handleError;

      @HandleCliActionErrors()
      async execute(): Promise<void> {
        throw new Error('async boom');
      }
    }

    await new TestService().execute();

    expect(handleError).toHaveBeenCalledWith(new Error('async boom'));
  });

  it('should return original result when no error occurs', async () => {
    class TestService {
      @HandleCliActionErrors()
      execute(): string {
        return 'ok';
      }
    }

    await expect(Promise.resolve(new TestService().execute())).resolves.toBe('ok');
  });

  it('should reject with a normalized error when handleError is unavailable', async () => {
    class TestService {
      @HandleCliActionErrors()
      execute(): void {
        throw 'boom';
      }
    }

    await expect(new TestService().execute()).rejects.toEqual(new Error('boom'));
  });

  it('should leave non-callable descriptors unchanged', () => {
    const decorator = HandleCliActionErrors();
    const descriptor: PropertyDescriptor = { configurable: true, value: 42 };

    const result = decorator({}, 'execute', descriptor);

    expect(result).toEqual(descriptor);
  });
});
