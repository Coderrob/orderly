import * as services from './index';

describe('cli services index exports', () => {
  it('should expose all CLI services', () => {
    expect(services.ConfigService).toBeDefined();
    expect(services.DirectoryValidator).toBeDefined();
    expect(services.ManifestService).toBeDefined();
  });
});
