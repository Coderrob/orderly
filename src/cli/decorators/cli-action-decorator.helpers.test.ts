import {
  createCliActionMethodDecorator,
  createWrappedCliActionDescriptor,
  createWrappedCliActionMethodDecorator,
  invokeCliAction,
  isCliActionExecution,
  type CliActionExecution
} from './cli-action-decorator.helpers';

describe('cli action decorator helpers', () => {
  it('should create an action method decorator that delegates to the wrapper', () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value() {
        return 'ok';
      },
      writable: true
    } satisfies PropertyDescriptor;
    const wrappedDescriptor = { ...descriptor, value: jest.fn() };
    const wrapDescriptor = jest.fn().mockReturnValue(wrappedDescriptor);

    const decorator = createCliActionMethodDecorator(wrapDescriptor);
    const result = decorator({}, 'run', descriptor);

    expect(wrapDescriptor).toHaveBeenCalledWith(descriptor);
    expect(result).toBe(wrappedDescriptor);
  });

  it('should wrap callable action descriptor values', async () => {
    const originalMethod = jest.fn().mockResolvedValue('wrapped');
    const wrapper = jest.fn((originalMethodRef: { readonly invoke: CliActionExecution }) => {
      const wrappedMethod: CliActionExecution = async function executeWrapped(
        this: unknown
      ): Promise<unknown> {
        return originalMethodRef.invoke.call(this);
      };

      return wrappedMethod;
    });
    const descriptor = {
      configurable: true,
      enumerable: false,
      value: originalMethod,
      writable: true
    } satisfies PropertyDescriptor;

    const wrappedDescriptor = createWrappedCliActionDescriptor(descriptor, wrapper);
    const result = await wrappedDescriptor.value.call({});

    expect(wrapper).toHaveBeenCalledWith({ invoke: originalMethod });
    expect(result).toBe('wrapped');
  });

  it('should preserve non-callable action descriptor values', () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value: 'not-a-function',
      writable: true
    } satisfies PropertyDescriptor;
    const wrapper = jest.fn();

    const wrappedDescriptor = createWrappedCliActionDescriptor(descriptor, wrapper);

    expect(wrappedDescriptor).toEqual(descriptor);
    expect(wrappedDescriptor).not.toBe(descriptor);
    expect(wrapper).not.toHaveBeenCalled();
  });

  it('should create configured wrapped action decorators', async () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value() {
        return 'ok';
      },
      writable: true
    } satisfies PropertyDescriptor;
    const createWrapperFactory = jest.fn((_value: undefined) => {
      const wrapperFactory = jest.fn((originalMethodRef: { readonly invoke: CliActionExecution }) => {
        const wrappedMethod: CliActionExecution = async function executeWrapped(
          this: unknown
        ): Promise<unknown> {
          const result = await originalMethodRef.invoke.call(this);
          return `${String(result)}:wrapped`;
        };

        return wrappedMethod;
      });

      return wrapperFactory;
    });

    const decorator = createWrappedCliActionMethodDecorator(
      { value: undefined },
      createWrapperFactory
    );
    const wrappedDescriptor = decorator({}, 'run', descriptor) as PropertyDescriptor;
    const result = await wrappedDescriptor.value.call({});

    expect(createWrapperFactory).toHaveBeenCalledWith(undefined);
    expect(result).toBe('ok:wrapped');
  });

  it('should invoke action methods with the provided context and arguments', async () => {
    const context = { value: 3 };
    const invoke: CliActionExecution = function execute(
      this: unknown,
      ...args: readonly unknown[]
    ): string {
      return String((this as { value: number }).value + (args[0] as number));
    };

    const result = await invokeCliAction({ invoke }, context, [4]);

    expect(result).toBe('7');
  });

  it('should identify action executions', () => {
    expect(isCliActionExecution(() => undefined)).toBe(true);
    expect(isCliActionExecution('nope')).toBe(false);
  });
});
