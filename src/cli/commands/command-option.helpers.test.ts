import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';

describe('command option helpers', () => {
  it('should read optional boolean properties', () => {
    expect(getOptionalBooleanOption({ enabled: true }, 'enabled')).toBe(true);
    expect(getOptionalBooleanOption({ enabled: 'yes' }, 'enabled')).toBeUndefined();
    expect(getOptionalBooleanOption({}, 'enabled')).toBeUndefined();
  });

  it('should read optional string properties', () => {
    expect(getOptionalStringOption({ format: 'json' }, 'format')).toBe('json');
    expect(getOptionalStringOption({ format: false }, 'format')).toBeUndefined();
    expect(getOptionalStringOption({}, 'format')).toBeUndefined();
  });

  it('should normalize object options by merging partial normalizers', () => {
    const result = normalizeObjectOptions<{ readonly enabled?: boolean; readonly format?: string }>(
      { enabled: true, format: 'json' },
      value => ({ enabled: getOptionalBooleanOption(value, 'enabled') }),
      value => ({ format: getOptionalStringOption(value, 'format') })
    );

    expect(result).toEqual({ enabled: true, format: 'json' });
  });

  it('should return an empty object for non-object option values', () => {
    expect(normalizeObjectOptions('invalid', () => ({ enabled: true }))).toEqual({});
  });
});
