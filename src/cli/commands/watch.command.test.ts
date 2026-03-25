import { WatchHandler } from './watch.command';

describe('WatchHandler', () => {
  const mockOrganizeHandler = {
    execute: jest.fn().mockResolvedValue({
      success: true,
      exitCode: 0
    })
  };

  let handler: WatchHandler;

  beforeEach(() => {
    handler = new WatchHandler(mockOrganizeHandler as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should run the requested number of watch cycles', async () => {
    jest.useFakeTimers();

    const resultPromise = handler.execute('/tmp', { cycles: '2', interval: '1' });

    await Promise.resolve();
    expect(mockOrganizeHandler.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(mockOrganizeHandler.execute).toHaveBeenCalledTimes(2);
    expect(result.message).toContain('2 watch cycles');
  });

  it('should fall back to default interval for invalid values', async () => {
    const result = await handler.execute('/tmp', { cycles: '1', interval: '0' });

    expect(result.success).toBe(true);
    expect(mockOrganizeHandler.execute).toHaveBeenCalledTimes(1);
  });

  it('should default invalid cycle counts to continuous mode in the private helper', () => {
    expect((handler as any).resolveCycleLimit('-1')).toBe(0);
    expect((handler as any).resolveCycleLimit('invalid')).toBe(0);
  });

  it('should resolve explicit valid interval and cycle values in private helpers', () => {
    expect((handler as any).resolveIntervalSeconds('3')).toBe(3);
    expect((handler as any).resolveCycleLimit('4')).toBe(4);
  });

  it('should detect when the requested cycle limit has been reached', () => {
    expect((handler as any).hasReachedCycleLimit(0, 0)).toBe(false);
    expect((handler as any).hasReachedCycleLimit(2, 2)).toBe(true);
  });

  it('should use the default interval for non-numeric values', () => {
    expect((handler as any).resolveIntervalSeconds('invalid')).toBe(5);
  });

  it('should immediately stop when the cycle limit has already been reached', async () => {
    const result = await (handler as any).runCycles({
      completedCycles: 2,
      cycleLimit: 2,
      directory: '/tmp',
      intervalSeconds: 1,
      options: {}
    });

    expect(result).toBe(2);
    expect(mockOrganizeHandler.execute).not.toHaveBeenCalled();
  });
});
