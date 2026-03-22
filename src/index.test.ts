import * as root from './index';

describe('root index exports', () => {
  it('should expose the main public modules', () => {
    expect(root.InitHandler).toBeDefined();
    expect(root.OrganizeHandler).toBeDefined();
    expect(root.ScanHandler).toBeDefined();
    expect(root.ConfigLoader).toBeDefined();
    expect(root.DedupeService).toBeDefined();
    expect(root.Logger).toBeDefined();
    expect(root.FileOrganizer).toBeDefined();
    expect(root.FileScanner).toBeDefined();
    expect(root.NamingUtils).toBeDefined();
  });
});
