import type { ICommandResult } from '../interfaces';

import {
  createCommandMiddlewareDecorator,
  createCommandMiddlewareWrapper,
  createCommandMethodDecorator,
  createWrappedCommandMethodDecorator,
  createWrappedDescriptor,
  invokeCommand,
  isCommandExecution,
  isCommandResult,
  type CommandExecution
} from './command-decorator.helpers';

describe('command decorator helpers', () => {
  it('should create a method decorator that delegates to the wrapper', () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value() {
        return { exitCode: 0, message: 'ok', success: true } satisfies ICommandResult;
      },
      writable: true
    } satisfies PropertyDescriptor;
    const wrappedDescriptor = { ...descriptor, value: jest.fn() };
    const wrapDescriptor = jest.fn().mockReturnValue(wrappedDescriptor);

    const decorator = createCommandMethodDecorator(wrapDescriptor);
    const result = decorator({}, 'run', descriptor);

    expect(wrapDescriptor).toHaveBeenCalledWith(descriptor);
    expect(result).toBe(wrappedDescriptor);
  });

  it('should wrap callable descriptor values', async () => {
    const originalMethod = jest.fn().mockResolvedValue({
      exitCode: 0,
      message: 'wrapped',
      success: true
    } satisfies ICommandResult);
    const wrapper = jest.fn((originalMethodRef: { readonly invoke: CommandExecution }) => {
      const wrappedMethod: CommandExecution = async function executeWrapped(
        this: object
      ): Promise<ICommandResult> {
        const result = await originalMethodRef.invoke.call(this);
        return result as ICommandResult;
      };

      return wrappedMethod;
    });
    const descriptor = {
      configurable: true,
      enumerable: false,
      value: originalMethod,
      writable: true
    } satisfies PropertyDescriptor;

    const wrappedDescriptor = createWrappedDescriptor(descriptor, wrapper);
    const result = await wrappedDescriptor.value.call({});

    expect(wrapper).toHaveBeenCalledWith({ invoke: originalMethod });
    expect(result).toEqual({ exitCode: 0, message: 'wrapped', success: true });
  });

  it('should create configured wrapped command decorators', async () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value() {
        return { exitCode: 0, message: 'ok', success: true } satisfies ICommandResult;
      },
      writable: true
    } satisfies PropertyDescriptor;
    const createWrapperFactory = jest.fn((label: string) => {
      const wrapperFactory = jest.fn((originalMethodRef: { readonly invoke: CommandExecution }) => {
        const wrappedMethod: CommandExecution = async function executeWrapped(
          this: object
        ): Promise<ICommandResult> {
          const result = await originalMethodRef.invoke.call(this);
          return { ...(result as ICommandResult), message: `${label}:wrapped` };
        };

        return wrappedMethod;
      });

      return wrapperFactory;
    });

    const decorator = createWrappedCommandMethodDecorator({ value: 'test' }, createWrapperFactory);
    const wrappedDescriptor = decorator({}, 'run', descriptor) as PropertyDescriptor;
    const result = await wrappedDescriptor.value.call({});

    expect(createWrapperFactory).toHaveBeenCalledWith('test');
    expect(result).toEqual({ exitCode: 0, message: 'test:wrapped', success: true });
  });

  it('should create command middleware decorators', async () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value() {
        return { exitCode: 0, message: 'ok', success: true } satisfies ICommandResult;
      },
      writable: true
    } satisfies PropertyDescriptor;
    const middleware = jest.fn(
      async (
        label: string,
        originalMethodRef: Readonly<{ invoke: CommandExecution }>,
        context: object
      ): Promise<ICommandResult> => {
        const result = await originalMethodRef.invoke.call(context);
        return { ...(result as ICommandResult), message: `${label}:middleware` };
      }
    );

    const decorator = createCommandMiddlewareDecorator({ value: 'test' }, { invoke: middleware });
    const wrappedDescriptor = decorator({}, 'run', descriptor) as PropertyDescriptor;
    const result = await wrappedDescriptor.value.call({});

    expect(middleware).toHaveBeenCalledWith('test', { invoke: descriptor.value }, {}, []);
    expect(result).toEqual({ exitCode: 0, message: 'test:middleware', success: true });
  });

  it('should create plain command middleware wrappers', async () => {
    const originalMethod: CommandExecution =
      async function executeOriginal(): Promise<ICommandResult> {
        return { exitCode: 0, message: 'ok', success: true };
      };
    const middleware = jest.fn(
      async (
        label: string,
        originalMethodRef: Readonly<{ invoke: CommandExecution }>,
        context: object
      ): Promise<ICommandResult> => {
        const result = await originalMethodRef.invoke.call(context);
        return { ...(result as ICommandResult), message: `${label}:wrapped` };
      }
    );

    const wrapper = createCommandMiddlewareWrapper({ value: 'test' }, { invoke: middleware });
    const wrappedMethod = wrapper({ invoke: originalMethod });
    const result = await wrappedMethod.call({});

    expect(middleware).toHaveBeenCalledWith('test', { invoke: originalMethod }, {}, []);
    expect(result).toEqual({ exitCode: 0, message: 'test:wrapped', success: true });
  });

  it('should preserve non-callable descriptor values', () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      value: 'not-a-function',
      writable: true
    } satisfies PropertyDescriptor;
    const wrapper = jest.fn();

    const wrappedDescriptor = createWrappedDescriptor(descriptor, wrapper);

    expect(wrappedDescriptor).toEqual(descriptor);
    expect(wrappedDescriptor).not.toBe(descriptor);
    expect(wrapper).not.toHaveBeenCalled();
  });

  it('should invoke command methods with the provided context and arguments', async () => {
    const context = { value: 3 };
    const invoke: CommandExecution = function execute(
      this: object,
      ...args: readonly unknown[]
    ): ICommandResult {
      const sum = (this as { value: number }).value + (args[0] as number);
      return { exitCode: 0, message: String(sum), success: true };
    };

    const result = await invokeCommand({ invoke }, context, [4]);

    expect(result).toEqual({ exitCode: 0, message: '7', success: true });
  });

  it('should identify command executions', () => {
    expect(isCommandExecution(() => undefined)).toBe(true);
    expect(isCommandExecution('nope')).toBe(false);
  });

  it('should identify command results', () => {
    expect(isCommandResult({ exitCode: 0, message: 'ok', success: true })).toBe(true);
    expect(isCommandResult({ exitCode: 0, success: true })).toBe(false);
    expect(isCommandResult(null)).toBe(false);
  });
});
