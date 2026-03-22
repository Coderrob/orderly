import * as utils from './index';

describe('utils index exports', () => {
  it('should expose utility classes and functions', () => {
    expect(utils.ConfigParser).toBeDefined();
    expect(utils.ConsoleOutputWriter).toBeDefined();
    expect(utils.FileCategorizer).toBeDefined();
    expect(utils.FileSystemUtils).toBeDefined();
    expect(utils.NamingUtils).toBeDefined();
    expect(utils.formatJson).toBeDefined();
    expect(utils.parseJsonFile).toBeDefined();
    expect(utils.safeJsonParse).toBeDefined();
    expect(utils.writeJsonFile).toBeDefined();
    expect(utils.isArray).toBeDefined();
    expect(utils.isBoolean).toBeDefined();
    expect(utils.isNullOrUndefined).toBeDefined();
    expect(utils.isNumber).toBeDefined();
    expect(utils.isObject).toBeDefined();
    expect(utils.isOrderlyError).toBeDefined();
    expect(utils.isPrimitive).toBeDefined();
    expect(utils.isString).toBeDefined();
  });
});
