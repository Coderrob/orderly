import { ConsoleOutputWriter } from './console-output.writer';
import { IOutputWriter, OutputFormat } from '../types/output';

// Mock chalk to avoid ESM issues in tests
jest.mock('chalk', () => ({
  green: jest.fn((text: string) => `[GREEN]${text}[/GREEN]`),
  yellow: jest.fn((text: string) => `[YELLOW]${text}[/YELLOW]`),
  red: jest.fn((text: string) => `[RED]${text}[/RED]`),
  bold: jest.fn((text: string) => `[BOLD]${text}[/BOLD]`),
  blue: jest.fn((text: string) => `[BLUE]${text}[/BLUE]`),
  gray: jest.fn((text: string) => `[GRAY]${text}[/GRAY]`),
  cyan: jest.fn((text: string) => `[CYAN]${text}[/CYAN]`)
}));

describe('ConsoleOutputWriter', () => {
  let outputWriter: IOutputWriter;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    outputWriter = new ConsoleOutputWriter();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('IOutputWriter contract', () => {
    it('should implement IOutputWriter interface', () => {
      expect(outputWriter).toBeInstanceOf(ConsoleOutputWriter);
      expect(typeof outputWriter.success).toBe('function');
      expect(typeof outputWriter.info).toBe('function');
      expect(typeof outputWriter.warning).toBe('function');
      expect(typeof outputWriter.error).toBe('function');
      expect(typeof outputWriter.write).toBe('function');
      expect(typeof outputWriter.newline).toBe('function');
      expect(typeof outputWriter.writeFormatted).toBe('function');
      expect(typeof outputWriter.section).toBe('function');
      expect(typeof outputWriter.keyValue).toBe('function');
    });
  });

  describe('success', () => {
    it('should write success message with green color', () => {
      const message = 'Operation completed successfully';

      outputWriter.success(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(`[GREEN]${message}[/GREEN]`);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('info', () => {
    it('should write info message', () => {
      const message = 'This is an info message';

      outputWriter.info(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning', () => {
    it('should write warning message with yellow color', () => {
      const message = 'This is a warning';

      outputWriter.warning(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(`[YELLOW]${message}[/YELLOW]`);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error', () => {
    it('should write error message with red color', () => {
      const message = 'This is an error';

      outputWriter.error(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(`[RED]${message}[/RED]`);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('write', () => {
    it('should write plain message without formatting', () => {
      const message = 'Plain message';

      outputWriter.write(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('newline', () => {
    it('should write an empty line', () => {
      outputWriter.newline();

      expect(consoleLogSpy).toHaveBeenCalledWith();
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('section', () => {
    it('should write section header with bold formatting', () => {
      const title = 'Configuration';

      outputWriter.section(title);

      expect(consoleLogSpy).toHaveBeenCalledWith(`[BOLD]${title}[/BOLD]`);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyValue', () => {
    it('should write key-value pair with aligned formatting', () => {
      const key = 'Files processed';
      const value = '42';

      outputWriter.keyValue(key, value);

      expect(consoleLogSpy).toHaveBeenCalledWith(`${key}: ${value}`);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('writeFormatted', () => {
    it('should write JSON formatted data', () => {
      const data = { name: 'test', value: 123 };
      const format = OutputFormat.JSON;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 0));
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should write CSV formatted data', () => {
      const data = [
        { type: 'move', originalPath: '/old/path', newPath: '/new/path', reason: 'test' }
      ];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('type,originalPath,newPath,reason');
      expect(consoleLogSpy).toHaveBeenCalledWith('move,/old/path,/new/path,test');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty CSV array', () => {
      const data: unknown[] = [];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle CSV array with non-objects', () => {
      const data = ['string', 42, null];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('string');
      expect(consoleLogSpy).toHaveBeenCalledWith('42');
      expect(consoleLogSpy).toHaveBeenCalledWith('null');
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle CSV with null and undefined values', () => {
      const data = [{ name: 'test', value: null, other: undefined }];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('name,value,other');
      expect(consoleLogSpy).toHaveBeenCalledWith('test,,');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should escape CSV values with commas', () => {
      const data = [{ message: 'hello, world', count: 1 }];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('message,count');
      expect(consoleLogSpy).toHaveBeenCalledWith('"hello, world",1');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle CSV with object and array values', () => {
      const data = [{ name: 'test', config: { enabled: true }, tags: ['a', 'b'] }];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('name,config,tags');
      expect(consoleLogSpy).toHaveBeenCalledWith('test,{"enabled":true},"[""a"",""b""]"');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle CSV with symbol values', () => {
      const symbolValue = Symbol('test');
      const data = [{ name: 'test', symbolProp: symbolValue }];
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('name,symbolProp');
      expect(consoleLogSpy).toHaveBeenCalledWith('test,');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should write table formatted data', () => {
      const data = [
        { type: 'move', originalPath: '/old/path', newPath: '/new/path', reason: 'test' }
      ];
      const format = OutputFormat.TABLE;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('- [object Object]');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle table with non-array data', () => {
      const data = { key: 'value' };
      const format = OutputFormat.TABLE;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('[object Object]');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle empty operations array', () => {
      const data: unknown[] = [];
      const format = OutputFormat.JSON;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 0));
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle CSV with non-array data', () => {
      const data = 'not an array';
      const format = OutputFormat.CSV;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('not an array');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown format as string', () => {
      const data = { test: 'data' };
      const format = 'unknown' as OutputFormat;

      outputWriter.writeFormatted(data, format);

      expect(consoleLogSpy).toHaveBeenCalledWith('[object Object]');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });
});
