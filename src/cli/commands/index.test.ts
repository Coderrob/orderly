import * as commands from './index';

describe('cli commands index exports', () => {
  it('should expose all CLI command handlers', () => {
    expect(commands.CleanHandler).toBeDefined();
    expect(commands.ConfigValidateHandler).toBeDefined();
    expect(commands.DedupeHandler).toBeDefined();
    expect(commands.InitHandler).toBeDefined();
    expect(commands.OrganizeHandler).toBeDefined();
    expect(commands.RevertHandler).toBeDefined();
    expect(commands.ScanHandler).toBeDefined();
    expect(commands.WatchHandler).toBeDefined();
  });
});
