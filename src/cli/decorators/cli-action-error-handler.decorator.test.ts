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
});
