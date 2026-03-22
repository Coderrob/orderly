import { extractExifFromJpeg } from './jpeg-exif-parser';

describe('jpeg-exif-parser', () => {
  describe('extractExifFromJpeg', () => {
    it('should return null for non-JPEG data', () => {
      expect(extractExifFromJpeg(Buffer.from('hello', 'ascii'))).toBeNull();
    });

    it('should return null when JPEG has no APP1 segment', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
      expect(extractExifFromJpeg(jpeg)).toBeNull();
    });

    it('should return null when APP1 payload is not EXIF', () => {
      const payload = Buffer.from('not-exif-payload', 'ascii');
      const jpeg = wrapApp1(payload);
      expect(extractExifFromJpeg(jpeg)).toBeNull();
    });

    it('should return null on invalid TIFF byte order', () => {
      const payload = Buffer.concat([
        Buffer.from('Exif\u0000\u0000', 'ascii'),
        Buffer.from('ZZbad-tiff', 'ascii')
      ]);
      expect(extractExifFromJpeg(wrapApp1(payload))).toBeNull();
    });

    it('should extract Make from little-endian EXIF APP1', () => {
      const exifPayload = createExifPayloadLittleEndian([{ tag: 0x010f, value: 'Canon' }]);
      const result = extractExifFromJpeg(wrapApp1(exifPayload));

      expect(result).toEqual({ Make: 'Canon' });
    });

    it('should extract Model from big-endian EXIF APP1', () => {
      const exifPayload = createExifPayloadBigEndian([{ tag: 0x0110, value: 'X-T5' }]);
      const result = extractExifFromJpeg(wrapApp1(exifPayload));

      expect(result).toEqual({ Model: 'X-T5' });
    });

    it('should ignore non-ASCII tags and keep valid ASCII tags', () => {
      const exifPayload = createExifPayloadLittleEndian([
        { tag: 0x0112, value: '1', forceType: 3 },
        { tag: 0x010f, value: 'Nikon' }
      ]);
      const result = extractExifFromJpeg(wrapApp1(exifPayload));

      expect(result).toEqual({ Make: 'Nikon' });
    });

    it('should return null when IFD offset is invalid', () => {
      const tiffHeader = Buffer.alloc(8);
      tiffHeader.write('II', 0, 'ascii');
      tiffHeader.writeUInt16LE(42, 2);
      tiffHeader.writeUInt32LE(5000, 4);

      const payload = Buffer.concat([Buffer.from('Exif\u0000\u0000', 'ascii'), tiffHeader]);
      expect(extractExifFromJpeg(wrapApp1(payload))).toBeNull();
    });
  });
});

type ExifAsciiField = {
  tag: number;
  value: string;
  forceType?: number;
};

function wrapApp1(payload: Buffer): Buffer {
  const app1Length = Buffer.alloc(2);
  app1Length.writeUInt16BE(payload.length + 2, 0);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1]),
    app1Length,
    payload,
    Buffer.from([0xff, 0xd9])
  ]);
}

function createExifPayloadLittleEndian(fields: ExifAsciiField[]): Buffer {
  return createExifPayload(fields, true);
}

function createExifPayloadBigEndian(fields: ExifAsciiField[]): Buffer {
  return createExifPayload(fields, false);
}

function createExifPayload(fields: ExifAsciiField[], littleEndian: boolean): Buffer {
  const writeU16 = (buf: Buffer, value: number, offset: number): void => {
    if (littleEndian) buf.writeUInt16LE(value, offset);
    else buf.writeUInt16BE(value, offset);
  };

  const writeU32 = (buf: Buffer, value: number, offset: number): void => {
    if (littleEndian) buf.writeUInt32LE(value, offset);
    else buf.writeUInt32BE(value, offset);
  };

  const tiffHeader = Buffer.alloc(8);
  tiffHeader.write(littleEndian ? 'II' : 'MM', 0, 'ascii');
  writeU16(tiffHeader, 42, 2);
  writeU32(tiffHeader, 8, 4);

  const fieldCount = Buffer.alloc(2);
  writeU16(fieldCount, fields.length, 0);

  const entries = Buffer.alloc(fields.length * 12);
  const nextIfdOffset = Buffer.alloc(4);

  const values: Buffer[] = [];
  let nextValueOffset = 8 + 2 + entries.length + 4;

  fields.forEach((field, index) => {
    const pos = index * 12;
    writeU16(entries, field.tag, pos);

    const text = `${field.value}\u0000`;
    const encoded = Buffer.from(text, 'ascii');
    const type = field.forceType ?? 2;

    writeU16(entries, type, pos + 2);
    writeU32(entries, encoded.length, pos + 4);

    if (encoded.length <= 4) {
      encoded.copy(entries, pos + 8);
    } else {
      writeU32(entries, nextValueOffset, pos + 8);
      values.push(encoded);
      nextValueOffset += encoded.length;
    }
  });

  const tiff = Buffer.concat([tiffHeader, fieldCount, entries, nextIfdOffset, ...values]);
  return Buffer.concat([Buffer.from('Exif\u0000\u0000', 'ascii'), tiff]);
}
