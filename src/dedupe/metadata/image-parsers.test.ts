import { extractImageDimensions } from './image-parsers';

describe('image-parsers', () => {
  describe('extractImageDimensions', () => {
    it('should extract PNG dimensions', () => {
      const png = createMinimalPng(320, 240);
      expect(extractImageDimensions(png)).toEqual({ width: 320, height: 240 });
    });

    it('should return null for PNG with zero width/height', () => {
      const png = createMinimalPng(0, 0);
      expect(extractImageDimensions(png)).toBeNull();
    });

    it('should extract GIF dimensions', () => {
      const gif = createMinimalGif(120, 80);
      expect(extractImageDimensions(gif)).toEqual({ width: 120, height: 80 });
    });

    it('should extract GIF87a dimensions', () => {
      const gif = createMinimalGif(120, 80, 'GIF87a');
      expect(extractImageDimensions(gif)).toEqual({ width: 120, height: 80 });
    });

    it('should return null for GIF with zero dimensions', () => {
      const gif = createMinimalGif(0, 80);
      expect(extractImageDimensions(gif)).toBeNull();
    });

    it('should return null for GIF buffers with an unknown header', () => {
      const gif = createMinimalGif(120, 80);
      gif.write('NOTGIF', 0, 'ascii');

      expect(extractImageDimensions(gif)).toBeNull();
    });

    it('should extract BMP dimensions', () => {
      const bmp = createMinimalBmp(1920, 1080);
      expect(extractImageDimensions(bmp)).toEqual({ width: 1920, height: 1080 });
    });

    it('should treat top-down BMP height as positive dimensions', () => {
      const bmp = createMinimalBmp(1920, -1080);
      expect(extractImageDimensions(bmp)).toEqual({ width: 1920, height: 1080 });
    });

    it('should return null for BMP with unsupported DIB header size', () => {
      const bmp = createMinimalBmp(50, 50);
      bmp.writeUInt32LE(12, 14);
      expect(extractImageDimensions(bmp)).toBeNull();
    });

    it('should return null for BMP with zero dimensions', () => {
      const bmp = createMinimalBmp(0, 50);

      expect(extractImageDimensions(bmp)).toBeNull();
    });

    it('should extract JPEG dimensions from SOF segment', () => {
      const jpeg = createMinimalJpegWithSof(640, 480);
      expect(extractImageDimensions(jpeg)).toEqual({ width: 640, height: 480 });
    });

    it('should extract JPEG dimensions when the buffer ends exactly after the SOF width bytes', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80]);

      expect(extractImageDimensions(jpeg)).toEqual({ width: 640, height: 480 });
    });

    it('should extract JPEG dimensions when fill bytes appear before the SOF marker', () => {
      const jpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80
      ]);

      expect(extractImageDimensions(jpeg)).toEqual({ width: 640, height: 480 });
    });

    it('should extract JPEG dimensions when a stuffed byte appears before the SOF marker', () => {
      const jpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80
      ]);

      expect(extractImageDimensions(jpeg)).toEqual({ width: 640, height: 480 });
    });

    it('should return null for JPEG with invalid segment length', () => {
      const jpeg = createBrokenJpeg();
      expect(extractImageDimensions(jpeg)).toBeNull();
    });

    it('should return null when JPEG reaches a stop marker before SOF', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 0xff, 0xd9]);
      expect(extractImageDimensions(jpeg)).toBeNull();
    });

    it('should return null when a JPEG contains no additional marker prefix', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);

      expect(extractImageDimensions(jpeg)).toBeNull();
    });

    it('should return null when no marker prefix is found after SOI while scanning segments', () => {
      const jpeg = Buffer.from([
        0xff, 0xd8, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a
      ]);

      expect(extractImageDimensions(jpeg)).toBeNull();
    });

    it('should continue scanning after a non-SOF segment and return null when no SOF exists', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xd9]);

      expect(extractImageDimensions(jpeg)).toBeNull();
    });

    it('should return null for JPEG SOF segments with incomplete dimension bytes', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10]);

      expect(extractImageDimensions(jpeg)).toBeNull();
    });

    it('should return null when PNG header does not contain IHDR', () => {
      const png = createMinimalPng(320, 240);
      png.write('TEXT', 12, 'ascii');
      expect(extractImageDimensions(png)).toBeNull();
    });

    it('should return null for non-image buffers', () => {
      const txt = Buffer.from('not-an-image', 'ascii');
      expect(extractImageDimensions(txt)).toBeNull();
    });
  });
});

function createMinimalPng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);

  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);

  return buffer;
}

function createMinimalGif(
  width: number,
  height: number,
  header: 'GIF87a' | 'GIF89a' = 'GIF89a'
): Buffer {
  const buffer = Buffer.alloc(10);
  buffer.write(header, 0, 'ascii');
  buffer.writeUInt16LE(width, 6);
  buffer.writeUInt16LE(height, 8);
  return buffer;
}

function createMinimalBmp(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(54);
  buffer.write('BM', 0, 'ascii');
  buffer.writeUInt32LE(54, 2);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  return buffer;
}

function createMinimalJpegWithSof(width: number, height: number): Buffer {
  const sof = Buffer.alloc(17);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 3;
  sof[10] = 1;
  sof[11] = 0x11;
  sof[12] = 0;
  sof[13] = 2;
  sof[14] = 0x11;
  sof[15] = 1;
  sof[16] = 3;

  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.from([0xff, 0xd9])]);
}

function createBrokenJpeg(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0xff, 0xd9]);
}
