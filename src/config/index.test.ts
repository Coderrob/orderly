import * as config from './index';

describe('config index exports', () => {
  it('should expose config loader and config types', () => {
    expect(config.ConfigLoader).toBeDefined();
    expect(config.ConfigFormat).toBeDefined();
    expect(config.DEFAULT_CONFIG).toBeDefined();
    expect(config.NamingConventionType).toBeDefined();
  });
});
