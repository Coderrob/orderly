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

  it('should run the requested number of watch cycles', async () => {
    const result = await handler.execute('/tmp', { cycles: '2', interval: '1' });

    expect(result.success).toBe(true);
    expect(mockOrganizeHandler.execute).toHaveBeenCalledTimes(2);
    expect(result.message).toContain('2 watch cycles');
  });

  it('should fall back to default interval for invalid values', async () => {
    const result = await handler.execute('/tmp', { cycles: '1', interval: '0' });

    expect(result.success).toBe(true);
    expect(mockOrganizeHandler.execute).toHaveBeenCalledTimes(1);
  });
});
