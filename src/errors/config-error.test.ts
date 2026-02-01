import {
  ConfigNotFoundError,
  UnsupportedConfigFormatError,
  ConfigParseError
} from './config-error';
import { ErrorCategory, ErrorCode } from './interfaces';

describe('Config Errors', () => {
  describe('ConfigNotFoundError', () => {
    it('should have CONFIG_NOT_FOUND code', () => {
      const error = new ConfigNotFoundError('/path/to/config.json');
      expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
    });

    it('should have CONFIG category', () => {
      const error = new ConfigNotFoundError('/path');
      expect(error.category).toBe(ErrorCategory.CONFIG);
    });

    it('should include path in message', () => {
      const error = new ConfigNotFoundError('/path/to/config.json');
      expect(error.message).toContain('/path/to/config.json');
    });

    it('should store path in context', () => {
      const error = new ConfigNotFoundError('/path/to/config.json');
      expect(error.context?.path).toBe('/path/to/config.json');
    });
  });

  describe('UnsupportedConfigFormatError', () => {
    it('should have UNSUPPORTED_CONFIG_FORMAT code', () => {
      const error = new UnsupportedConfigFormatError('.xml');
      expect(error.code).toBe(ErrorCode.UNSUPPORTED_CONFIG_FORMAT);
    });

    it('should include format in message', () => {
      const error = new UnsupportedConfigFormatError('.xml');
      expect(error.message).toContain('.xml');
    });
  });

  describe('ConfigParseError', () => {
    it('should have CONFIG_PARSE_ERROR code', () => {
      const error = new ConfigParseError('/config.json', 'Invalid JSON');
      expect(error.code).toBe(ErrorCode.CONFIG_PARSE_ERROR);
    });

    it('should store path and cause in context', () => {
      const error = new ConfigParseError('/config.json', 'Syntax error');
      expect(error.context?.path).toBe('/config.json');
      expect(error.context?.cause).toBe('Syntax error');
    });
  });
});
