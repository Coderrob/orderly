import {
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isNullOrUndefined,
  isPrimitive,
  isOrderlyError
} from './guards';

describe('isObject', () => {
  it.each([
    [{}, true, 'empty object'],
    [{ key: 'value' }, true, 'object with properties'],
    [new Object(), true, 'new Object()'],
    [null, false, 'null'],
    [undefined, false, 'undefined'],
    ['string', false, 'string'],
    [42, false, 'number'],
    [[], false, 'array'],
    [() => {}, false, 'function']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isObject(input)).toBe(expected);
  });
});

describe('isString', () => {
  it.each([
    ['hello', true, 'string primitive'],
    ['', true, 'empty string'],
    [`template`, true, 'template literal'],
    [String('test'), true, 'String() function call'],
    [null, false, 'null'],
    [undefined, false, 'undefined'],
    [42, false, 'number'],
    [{}, false, 'object']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isString(input)).toBe(expected);
  });
});

describe('isNullOrUndefined', () => {
  it.each([
    [null, true, 'null'],
    [undefined, true, 'undefined'],
    ['string', false, 'string'],
    [0, false, 'zero'],
    [false, false, 'false'],
    [{}, false, 'object'],
    [[], false, 'array']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isNullOrUndefined(input)).toBe(expected);
  });
});

describe('isNumber', () => {
  it.each([
    [42, true, 'positive number'],
    [0, true, 'zero'],
    [-10, true, 'negative number'],
    [3.14, true, 'decimal number'],
    [Number.NaN, true, 'NaN'],
    [Infinity, true, 'Infinity'],
    ['42', false, 'string number'],
    [null, false, 'null'],
    [undefined, false, 'undefined'],
    [{}, false, 'object']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isNumber(input)).toBe(expected);
  });
});

describe('isBoolean', () => {
  it.each([
    [true, true, 'true'],
    [false, true, 'false'],
    [1, false, 'number 1'],
    [0, false, 'number 0'],
    ['true', false, 'string true'],
    [null, false, 'null'],
    [undefined, false, 'undefined']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isBoolean(input)).toBe(expected);
  });
});

describe('isArray', () => {
  it.each([
    [[], true, 'empty array'],
    [[1, 2, 3], true, 'array with elements'],
    [new Array(), true, 'new Array()'],
    [{}, false, 'object'],
    [null, false, 'null'],
    [undefined, false, 'undefined'],
    ['array', false, 'string']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isArray(input)).toBe(expected);
  });
});

describe('isPrimitive', () => {
  it.each([
    ['string', true, 'string'],
    [42, true, 'number'],
    [true, true, 'boolean'],
    [null, true, 'null'],
    [undefined, true, 'undefined'],
    [Symbol('test'), true, 'symbol'],
    [BigInt(123), true, 'bigint'],
    [{}, false, 'object'],
    [[], false, 'array'],
    [() => {}, false, 'function']
  ])('should return %s for %s', (input, expected, description) => {
    expect(isPrimitive(input)).toBe(expected);
  });
});

describe('isOrderlyError', () => {
  it('should return true for OrderlyError instances', () => {
    const error = new (class extends Error {
      code = 'TEST_ERROR';
      category = 'validation';
    })();

    expect(isOrderlyError(error)).toBe(true);
  });

  it('should return false for regular Error instances', () => {
    const error = new Error('test');

    expect(isOrderlyError(error)).toBe(false);
  });

  it('should return false for Error with code but no category', () => {
    const error = new (class extends Error {
      code = 'TEST_ERROR';
    })();

    expect(isOrderlyError(error)).toBe(false);
  });

  it('should return false for Error with category but no code', () => {
    const error = new (class extends Error {
      category = 'validation';
    })();

    expect(isOrderlyError(error)).toBe(false);
  });

  it('should return false for non-Error objects', () => {
    expect(isOrderlyError('string')).toBe(false);
    expect(isOrderlyError(42)).toBe(false);
    expect(isOrderlyError(null)).toBe(false);
    expect(isOrderlyError(undefined)).toBe(false);
    expect(isOrderlyError({})).toBe(false);
  });
});
