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

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock hash
    mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash')
    };

    // Setup mock stream
    mockStream = {
      on: jest.fn()
    };

    // Mock the modules
    (createReadStream as jest.Mock).mockReturnValue(mockStream);
    (createHash as jest.Mock).mockReturnValue(mockHash);

    hasher = new Sha256Hasher();
  });

  describe('sha256', () => {
    it('should create read stream for the file path', async () => {
      const filePath = '/path/to/file.txt';

      // Setup stream events
      mockStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') callback(Buffer.from('test data'));
        if (event === 'end') callback();
      });

      await hasher.sha256(filePath);

      expect(createReadStream).toHaveBeenCalledWith(filePath);
    });

    it('should create SHA-256 hash', async () => {
      mockStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') callback(Buffer.from('test data'));
        if (event === 'end') callback();
      });

      await hasher.sha256('/path/to/file.txt');

      expect(createHash).toHaveBeenCalledWith('sha256');
    });

    it('should update hash with file data', async () => {
      const testData = Buffer.from('test data');
      mockStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') callback(testData);
        if (event === 'end') callback();
      });

      await hasher.sha256('/path/to/file.txt');

      expect(mockHash.update).toHaveBeenCalledWith(testData);
    });

    it('should return hex-encoded hash', async () => {
      const expectedHash = 'mocked-hash';
      mockHash.digest.mockReturnValue(expectedHash);

      mockStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') callback(Buffer.from('test'));
        if (event === 'end') callback();
      });

      const result = await hasher.sha256('/path/to/file.txt');

      expect(result).toBe(expectedHash);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
    });

    it('should handle multiple data chunks', async () => {
      const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];

      mockStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          for (const chunk of chunks) {
            callback(chunk);
          }
        } else if (event === 'end') {
          callback();
        }
      });

      await hasher.sha256('/path/to/file.txt');

      expect(mockHash.update).toHaveBeenCalledTimes(2);
      expect(mockHash.update).toHaveBeenNthCalledWith(1, chunks[0]);
      expect(mockHash.update).toHaveBeenNthCalledWith(2, chunks[1]);
    });

    it('should reject on stream error', async () => {
      const error = new Error('Stream error');

      mockStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') callback(error);
      });

      await expect(hasher.sha256('/path/to/file.txt')).rejects.toThrow('Stream error');
    });
  });
});
