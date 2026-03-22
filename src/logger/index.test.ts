import * as logger from './index';

describe('logger index exports', () => {
  it('should expose the Logger class', () => {
    expect(logger.Logger).toBeDefined();
  });
});
