import * as dedupe from './index';

describe('dedupe index exports', () => {
  it('should expose dedupe services, hashers, metadata, strategies, and enums', () => {
    expect(dedupe.DedupeReportWriter).toBeDefined();
    expect(dedupe.DedupeService).toBeDefined();
    expect(dedupe.Sha256Hasher).toBeDefined();
    expect(dedupe.MetadataExtractor).toBeDefined();
    expect(dedupe.ExifStrategy).toBeDefined();
    expect(dedupe.FileAttributesStrategy).toBeDefined();
    expect(dedupe.FilePropertiesStrategy).toBeDefined();
    expect(dedupe.ImageDimensionsStrategy).toBeDefined();
    expect(dedupe.NameStrategy).toBeDefined();
    expect(dedupe.Sha256Strategy).toBeDefined();
    expect(dedupe.SizeStrategy).toBeDefined();
    expect(dedupe.DedupeAction).toBeDefined();
    expect(dedupe.DedupeMode).toBeDefined();
  });
});
