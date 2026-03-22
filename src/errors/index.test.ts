import * as errors from './index';

describe('errors index exports', () => {
  it('should expose all public error types and enums', () => {
    expect(errors.OrderlyError).toBeDefined();
    expect(errors.ConfigNotFoundError).toBeDefined();
    expect(errors.ConfigParseError).toBeDefined();
    expect(errors.UnsupportedConfigFormatError).toBeDefined();
    expect(errors.HashingError).toBeDefined();
    expect(errors.MetadataReadError).toBeDefined();
    expect(errors.StrategyError).toBeDefined();
    expect(errors.DirectoryNotFoundError).toBeDefined();
    expect(errors.FileExistsError).toBeDefined();
    expect(errors.PermissionDeniedError).toBeDefined();
    expect(errors.ErrorCategory).toBeDefined();
    expect(errors.ErrorCode).toBeDefined();
    expect(errors.InvalidConfigError).toBeDefined();
    expect(errors.InvalidFormatError).toBeDefined();
    expect(errors.InvalidPathError).toBeDefined();
  });
});
