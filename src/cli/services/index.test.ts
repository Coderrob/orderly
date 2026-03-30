import * as services from './index';

describe('cli services index exports', () => {
  it('should expose all CLI services', () => {
    expect(services.ConfigService).toBeDefined();
    expect(services.DedupeRuntime).toBeDefined();
    expect(services.DedupeWorkflow).toBeDefined();
    expect(services.DirectoryValidator).toBeDefined();
    expect(services.ManifestService).toBeDefined();
    expect(services.OrganizeWorkflow).toBeDefined();
    expect(services.ScanWorkflow).toBeDefined();
  });
});
