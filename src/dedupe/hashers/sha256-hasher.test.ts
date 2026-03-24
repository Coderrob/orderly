import { Sha256Hasher } from '../hashers/sha256-hasher';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

// Mock the fs and crypto modules
jest.mock('node:fs', () => ({
  createReadStream: jest.fn()
}));

jest.mock('node:crypto', () => ({
  createHash: jest.fn()
}));

describe('Sha256Hasher', () => {
  let hasher: Sha256Hasher;
  let mockStream: any;
  let mockHash: any;

  const setAsyncStreamChunks = (chunks: readonly Buffer[]): void => {
    mockStream = {
      async *[Symbol.asyncIterator](): AsyncGenerator<Buffer, void, unknown> {
        for (const chunk of chunks) {
          yield chunk;
        }
      }
    };
    (createReadStream as jest.Mock).mockReturnValue(mockStream);
  };

  const setAsyncStreamError = (error: Error): void => {
    mockStream = {
      async *[Symbol.asyncIterator](): AsyncGenerator<Buffer, void, unknown> {
        yield Buffer.from('');
        throw error;
      }
    };
    (createReadStream as jest.Mock).mockReturnValue(mockStream);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock hash
    mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash')
    };

    // Setup mock stream
    setAsyncStreamChunks([Buffer.from('test data')]);

    // Mock the modules
    (createHash as jest.Mock).mockReturnValue(mockHash);

    hasher = new Sha256Hasher();
  });

  describe('sha256', () => {
    it('should create read stream for the file path', async () => {
      const filePath = '/path/to/file.txt';

      await hasher.sha256(filePath);

      expect(createReadStream).toHaveBeenCalledWith(filePath);
    });

    it('should create SHA-256 hash', async () => {
      await hasher.sha256('/path/to/file.txt');

      expect(createHash).toHaveBeenCalledWith('sha256');
    });

    it('should update hash with file data', async () => {
      const testData = Buffer.from('test data');
      setAsyncStreamChunks([testData]);

      await hasher.sha256('/path/to/file.txt');

      expect(mockHash.update).toHaveBeenCalledWith(testData);
    });

    it('should return hex-encoded hash', async () => {
      const expectedHash = 'mocked-hash';
      mockHash.digest.mockReturnValue(expectedHash);
      setAsyncStreamChunks([Buffer.from('test')]);

      const result = await hasher.sha256('/path/to/file.txt');

      expect(result).toBe(expectedHash);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
    });

    it('should handle multiple data chunks', async () => {
      const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];
      setAsyncStreamChunks(chunks);

      await hasher.sha256('/path/to/file.txt');

      expect(mockHash.update).toHaveBeenCalledTimes(2);
      expect(mockHash.update).toHaveBeenNthCalledWith(1, chunks[0]);
      expect(mockHash.update).toHaveBeenNthCalledWith(2, chunks[1]);
    });

    it('should reject on stream error', async () => {
      const error = new Error('Stream error');
      setAsyncStreamError(error);

      await expect(hasher.sha256('/path/to/file.txt')).rejects.toThrow('Stream error');
    });

    it('should skip non-Buffer and non-string chunks without updating the hash', async () => {
      mockStream = {
        async *[Symbol.asyncIterator](): AsyncGenerator<unknown, void, unknown> {
          yield 42 as unknown; // non-Buffer, non-string chunk
        }
      };
      (createReadStream as jest.Mock).mockReturnValue(mockStream);

      await hasher.sha256('/path/to/file.txt');

      expect(mockHash.update).not.toHaveBeenCalled();
    });
  });
});
