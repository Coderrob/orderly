import * as commands from './index';

describe('cli commands index exports', () => {
  it('should expose all CLI command handlers', () => {
    expect(commands.CleanHandler).toBeDefined();
    expect(commands.InitHandler).toBeDefined();
    expect(commands.OrganizeHandler).toBeDefined();
    expect(commands.ScanHandler).toBeDefined();
  });
});
