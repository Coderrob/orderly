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

  it('should expose shared command wrapper helpers', () => {
    expect(commands.getOptionalBooleanOption).toBeDefined();
    expect(commands.getOptionalStringOption).toBeDefined();
    expect(commands.normalizeObjectOptions).toBeDefined();
    expect(commands.createScannerCommandContext).toBeDefined();
    expect(commands.normalizeCommandContextOptions).toBeDefined();
    expect(commands.createWrappedAutoConfigCommand).toBeDefined();
    expect(commands.createDirectoryOptionsCommandExecutionRef).toBeDefined();
    expect(commands.createWrappedCommand).toBeDefined();
    expect(commands.createSingleOptionsCommandExecutionRef).toBeDefined();
    expect(commands.createWrappedSingleOptionsCommand).toBeDefined();
  });
});
