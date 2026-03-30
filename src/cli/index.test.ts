import * as cli from './index';

describe('cli index exports', () => {
  it('should expose the root cli factories', () => {
    expect(cli.createRootCommand).toBeDefined();
    expect(cli.createRootHandlers).toBeDefined();
    expect(cli.createRootServices).toBeDefined();
    expect(cli.createRootWorkflows).toBeDefined();
  });

  it('should expose core cli command handlers and workflows', () => {
    expect(cli.CleanHandler).toBeDefined();
    expect(cli.DedupeHandler).toBeDefined();
    expect(cli.OrganizeHandler).toBeDefined();
    expect(cli.ScanHandler).toBeDefined();
    expect(cli.ConfigService).toBeDefined();
    expect(cli.DedupeWorkflow).toBeDefined();
    expect(cli.OrganizeWorkflow).toBeDefined();
    expect(cli.ScanWorkflow).toBeDefined();
  });

  it('should expose core cli command and result helpers', () => {
    expect(cli.createCommandAction).toBeDefined();
    expect(cli.createDirectoryCommandAction).toBeDefined();
    expect(cli.runCommandResult).toBeDefined();
    expect(cli.addDirectoryArgument).toBeDefined();
    expect(cli.resolveDedupeConfig).toBeDefined();
    expect(cli.validateReplaceSafety).toBeDefined();
  });
});
