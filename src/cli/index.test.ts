import * as cli from './index';

describe('cli index exports', () => {
  it('should expose handlers and services', () => {
    expect(cli.CleanHandler).toBeDefined();
    expect(cli.InitHandler).toBeDefined();
    expect(cli.OrganizeHandler).toBeDefined();
    expect(cli.ScanHandler).toBeDefined();
    expect(cli.createRootCommand).toBeDefined();
    expect(cli.ConfigService).toBeDefined();
    expect(cli.DirectoryValidator).toBeDefined();
    expect(cli.ManifestService).toBeDefined();
  });
});
