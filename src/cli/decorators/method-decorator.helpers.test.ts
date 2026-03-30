import {
  createMethodDecorator,
  createWrappedMethodDecorator,
  createWrappedMethodDescriptor,
  invokeMethod,
  type MethodExecution
} from './method-decorator.helpers';

describe('method decorator helpers', () => {
  it('should create a method decorator that delegates to the wrapper', () => {
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

    const decorator = createMethodDecorator(wrapDescriptor);
    const result = decorator({}, 'run', descriptor);

    expect(wrapDescriptor).toHaveBeenCalledWith(descriptor);
    expect(result).toBe(wrappedDescriptor);
  });

  it('should wrap callable method descriptors', async () => {
    const originalMethod = jest.fn().mockResolvedValue('wrapped');
    const wrapper = jest.fn((originalMethodRef: { readonly invoke: MethodExecution }) => {
      const wrappedMethod: MethodExecution = async function executeWrapped(
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

    const wrappedDescriptor = createWrappedMethodDescriptor(descriptor, isMethodExecution, wrapper);
    const result = await wrappedDescriptor.value.call({});

    expect(wrapper).toHaveBeenCalledWith({ invoke: originalMethod });
    expect(result).toBe('wrapped');
  });

  it('should preserve non-callable method descriptors', () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value: 42,
      writable: true
    } satisfies PropertyDescriptor;
    const wrapper = jest.fn();

    const wrappedDescriptor = createWrappedMethodDescriptor(descriptor, isMethodExecution, wrapper);

    expect(wrappedDescriptor).toEqual(descriptor);
    expect(wrappedDescriptor).not.toBe(descriptor);
    expect(wrapper).not.toHaveBeenCalled();
  });

  it('should create configured wrapped method decorators', async () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value() {
        return 'ok';
      },
      writable: true
    } satisfies PropertyDescriptor;
    const createWrapperFactory = jest.fn((label: string) => {
      const wrapperFactory = jest.fn((originalMethodRef: { readonly invoke: MethodExecution }) => {
        const wrappedMethod: MethodExecution = async function executeWrapped(
          this: unknown
        ): Promise<unknown> {
          const result = await originalMethodRef.invoke.call(this);
          return `${label}:${String(result)}`;
        };

        return wrappedMethod;
      });

      return wrapperFactory;
    });

    const decorator = createWrappedMethodDecorator(
      { value: 'test' },
      isMethodExecution,
      createWrapperFactory
    );
    const wrappedDescriptor = decorator({}, 'run', descriptor) as PropertyDescriptor;
    const result = await wrappedDescriptor.value.call({});

    expect(createWrapperFactory).toHaveBeenCalledWith('test');
    expect(result).toBe('test:ok');
  });

  it('should invoke methods with the provided context and arguments', async () => {
    const context = { value: 3 };
    const invoke: MethodExecution = function execute(
      this: unknown,
      ...args: readonly unknown[]
    ): string {
      return String((this as { value: number }).value + (args[0] as number));
    };

    const result = await invokeMethod({ invoke }, context, [4]);

    expect(result).toBe('7');
  });
});

/**
 * Returns whether a value is a callable method.
 * @param value - Value to inspect.
 * @returns True when the value is callable.
 */
function isMethodExecution(value: unknown): value is MethodExecution {
  return typeof value === 'function';
}
