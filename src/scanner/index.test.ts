import * as scanner from './index';

describe('scanner index exports', () => {
  it('should expose the FileScanner class', () => {
    expect(scanner.FileScanner).toBeDefined();
  });
});
