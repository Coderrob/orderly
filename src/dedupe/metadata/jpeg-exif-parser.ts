const APP1_MARKER = 0xe1;

const IFD0_TAGS: Record<number, string> = {
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x0132: 'DateTime'
};

export function extractExifFromJpeg(data: Buffer): Record<string, string> | null {
  const payload = findApp1Payload(data);
  if (!payload || !isExifPayload(payload)) return null;

  const tiff = payload.subarray(6);
  const littleEndian = getByteOrder(tiff);
  if (littleEndian === null || tiff.length < 8) return null;

  const readU16 = (offset: number): number =>
    littleEndian ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset);
  const readU32 = (offset: number): number =>
    littleEndian ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset);

  if (readU16(2) !== 42) return null;

  const ifdOffset = readU32(4);
  return parseIfd0Ascii(tiff, ifdOffset, readU16, readU32);
}

function findApp1Payload(data: Buffer): Buffer | null {
  if (!isJpeg(data)) return null;

  let offset = 2;
  while (offset + 4 < data.length) {
    const marker = data[offset + 1];
    if (marker === 0xd9 || marker === 0xda) return null;

    const length = data.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > data.length) return null;

    if (marker === APP1_MARKER) {
      return data.subarray(offset + 4, offset + 2 + length);
    }

    offset += 2 + length;
  }

  return null;
}

function parseIfd0Ascii(
  tiff: Buffer,
  ifdOffset: number,
  readU16: (offset: number) => number,
  readU32: (offset: number) => number
): Record<string, string> | null {
  if (ifdOffset <= 0 || ifdOffset + 2 > tiff.length) return null;

  const fieldCount = readU16(ifdOffset);
  const values: Record<string, string> = {};

  for (let i = 0; i < fieldCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > tiff.length) break;

    const tag = readU16(entryOffset);
    const type = readU16(entryOffset + 2);
    const count = readU32(entryOffset + 4);
    const fieldName = IFD0_TAGS[tag];

    if (fieldName && type === 2 && count > 0) {
      const text = readAsciiValue(tiff, entryOffset + 8, count, readU32);
      if (text) values[fieldName] = text;
    }
  }

  return Object.keys(values).length > 0 ? values : null;
}

function readAsciiValue(
  tiff: Buffer,
  valueOffsetFieldPos: number,
  length: number,
  readU32: (offset: number) => number
): string | null {
  const start = length <= 4 ? valueOffsetFieldPos : readU32(valueOffsetFieldPos);
  if (start < 0 || start + length > tiff.length) return null;

  const value = tiff
    .subarray(start, start + length)
    .toString('ascii')
    .replaceAll('\u0000', '')
    .trim();

  return value.length > 0 ? value : null;
}

function isJpeg(data: Buffer): boolean {
  return data.length >= 4 && data[0] === 0xff && data[1] === 0xd8;
}

function isExifPayload(payload: Buffer): boolean {
  return payload.length >= 14 && payload.toString('ascii', 0, 6) === 'Exif\u0000\u0000';
}

function getByteOrder(tiff: Buffer): boolean | null {
  const order = tiff.toString('ascii', 0, 2);
  if (order === 'II') return true;
  if (order === 'MM') return false;
  return null;
}
