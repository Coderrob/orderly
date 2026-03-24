const APP1_MARKER = 0xe1;
const JPEG_SOI_PREFIX = 0xff;
const JPEG_SOI_MARKER = 0xd8;
const JPEG_EOI_MARKER = 0xd9;
const JPEG_SOS_MARKER = 0xda;
const JPEG_MIN_LENGTH = 4;
const JPEG_INITIAL_OFFSET = 2;
const JPEG_MARKER_TYPE_OFFSET = 1;
const JPEG_SEGMENT_LENGTH_OFFSET = 2;
const JPEG_SEGMENT_HEADER_BYTES = 2;
const JPEG_SEGMENT_PAYLOAD_BYTES = 4;
const JPEG_SEGMENT_MIN_LENGTH = 2;

const EXIF_HEADER_BYTE_E = 0x45;
const EXIF_HEADER_BYTE_X = 0x78;
const EXIF_HEADER_BYTE_I = 0x69;
const EXIF_HEADER_BYTE_F = 0x66;
const EXIF_HEADER_BYTE_ZERO = 0x00;
const EXIF_HEADER = Buffer.from([
  EXIF_HEADER_BYTE_E,
  EXIF_HEADER_BYTE_X,
  EXIF_HEADER_BYTE_I,
  EXIF_HEADER_BYTE_F,
  EXIF_HEADER_BYTE_ZERO,
  EXIF_HEADER_BYTE_ZERO
]);
const EXIF_MIN_PAYLOAD_LENGTH = 14;
const EXIF_HEADER_LENGTH = 6;

const TIFF_MIN_LENGTH = 8;
const TIFF_ENDIAN_MARK_LENGTH = 2;
const TIFF_MAGIC_OFFSET = 2;
const TIFF_MAGIC_NUMBER = 42;
const TIFF_IFD0_OFFSET = 4;

const IFD_FIELD_COUNT_BYTES = 2;
const IFD_ENTRY_SIZE = 12;
const IFD_TYPE_OFFSET = 2;
const IFD_COUNT_OFFSET = 4;
const IFD_VALUE_OFFSET = 8;
const FIELD_TYPE_ASCII = 2;
const INLINE_VALUE_MAX_LENGTH = 4;

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_ORIENTATION = 0x0112;
const TAG_DATE_TIME = 0x0132;

const BYTE_ORDER_II_BYTE = 0x49;
const BYTE_ORDER_MM_BYTE = 0x4d;
const BYTE_ORDER_II = Buffer.from([BYTE_ORDER_II_BYTE, BYTE_ORDER_II_BYTE]);
const BYTE_ORDER_MM = Buffer.from([BYTE_ORDER_MM_BYTE, BYTE_ORDER_MM_BYTE]);
const EMPTY_ASCII = '';
const NULL_CHAR = '\u0000';
const ASCII_DECODER = new TextDecoder('ascii');

interface ITiffReaders {
  readonly readU16: (offset: number) => number;
  readonly readU32: (offset: number) => number;
}

/**
 * Creates big-endian TIFF readers.
 * @param tiff - TIFF payload bytes.
 * @returns Endian-aware numeric readers.
 */
function createBigEndianReaders(tiff: Readonly<Buffer>): ITiffReaders {
  return {
    readU16: zReadU16BigEndian.bind(undefined, tiff),
    readU32: zReadU32BigEndian.bind(undefined, tiff)
  };
}

/**
 * Creates little-endian TIFF readers.
 * @param tiff - TIFF payload bytes.
 * @returns Endian-aware numeric readers.
 */
function createLittleEndianReaders(tiff: Readonly<Buffer>): ITiffReaders {
  return {
    readU16: zReadU16LittleEndian.bind(undefined, tiff),
    readU32: zReadU32LittleEndian.bind(undefined, tiff)
  };
}

/**
 * Creates endian-aware TIFF numeric readers.
 * @param tiff - TIFF payload bytes following the EXIF header.
 * @param options - Reader options.
 * @returns Endian-aware numeric readers.
 */
function createTiffReaders(
  tiff: Readonly<Buffer>,
  options: Readonly<{ littleEndian: boolean }>
): ITiffReaders {
  return options.littleEndian ? createLittleEndianReaders(tiff) : createBigEndianReaders(tiff);
}

/**
 * Extracts a subset of EXIF ASCII fields from a JPEG APP1 segment.
 * @param data - JPEG bytes to inspect.
 * @returns A map of extracted EXIF fields, or null when no supported EXIF payload is found.
 */
export function extractExifFromJpeg(data: Readonly<Buffer>): Record<string, string> | null {
  const payload = findApp1Payload(data);
  if (!payload || !isExifPayload(payload)) return null;

  const tiff = payload.subarray(EXIF_HEADER_LENGTH);
  const littleEndian = getByteOrder(tiff);
  if (littleEndian === null || tiff.length < TIFF_MIN_LENGTH) return null;

  const readers = createTiffReaders(tiff, { littleEndian });
  if (readers.readU16(TIFF_MAGIC_OFFSET) !== TIFF_MAGIC_NUMBER) return null;

  return parseIfd0Ascii(tiff, readers.readU32(TIFF_IFD0_OFFSET), readers.readU16, readers.readU32);
}

/**
 * Finds the first JPEG APP1 payload in the provided data.
 * @param data - JPEG bytes to inspect.
 * @returns The APP1 payload bytes, or null when no valid APP1 segment is found.
 */
function findApp1Payload(data: Readonly<Buffer>): Buffer | null {
  return isJpeg(data) ? findApp1PayloadFromOffset(data, JPEG_INITIAL_OFFSET) : null;
}

/**
 * Recursively scans JPEG segments until an APP1 payload is found.
 * @param data - JPEG bytes to inspect.
 * @param offset - Current JPEG segment offset.
 * @returns The APP1 payload bytes, or null when no valid APP1 segment exists.
 */
function findApp1PayloadFromOffset(data: Readonly<Buffer>, offset: number): Buffer | null {
  if (offset + JPEG_MIN_LENGTH >= data.length) return null;

  const marker = data[offset + JPEG_MARKER_TYPE_OFFSET];
  if (marker === JPEG_EOI_MARKER || marker === JPEG_SOS_MARKER) return null;

  const length = data.readUInt16BE(offset + JPEG_SEGMENT_LENGTH_OFFSET);
  if (isInvalidSegmentLength(length, offset, data.length)) return null;
  if (marker === APP1_MARKER) return getApp1Payload(data, offset, length);

  return findApp1PayloadFromOffset(data, offset + JPEG_SEGMENT_HEADER_BYTES + length);
}

/**
 * Returns the APP1 payload for a validated JPEG segment.
 * @param data - JPEG bytes.
 * @param offset - Segment start offset.
 * @param length - Segment payload length.
 * @returns APP1 payload slice.
 */
function getApp1Payload(data: Readonly<Buffer>, offset: number, length: number): Buffer {
  return data.subarray(
    offset + JPEG_SEGMENT_PAYLOAD_BYTES,
    offset + JPEG_SEGMENT_HEADER_BYTES + length
  );
}

/**
 * Determines the TIFF byte order declared in the EXIF payload.
 * @param tiff - TIFF payload bytes following the EXIF header.
 * @returns `true` for little-endian, `false` for big-endian, or null when invalid.
 */
function getByteOrder(tiff: Readonly<Buffer>): boolean | null {
  const order = tiff.subarray(0, TIFF_ENDIAN_MARK_LENGTH);
  if (order.equals(BYTE_ORDER_II)) return true;
  if (order.equals(BYTE_ORDER_MM)) return false;
  return null;
}

/**
 * Determines whether an APP1 payload starts with the EXIF identifier.
 * @param payload - APP1 payload bytes.
 * @returns True when the payload contains an EXIF header; otherwise false.
 */
function isExifPayload(payload: Readonly<Buffer>): boolean {
  return (
    payload.length >= EXIF_MIN_PAYLOAD_LENGTH &&
    payload.subarray(0, EXIF_HEADER.length).equals(EXIF_HEADER)
  );
}

/**
 * Determines whether a JPEG segment length is valid for the remaining buffer.
 * @param length - Segment payload length.
 * @param offset - Segment start offset.
 * @param dataLength - Total JPEG buffer length.
 * @returns True when the segment length is invalid.
 */
function isInvalidSegmentLength(length: number, offset: number, dataLength: number): boolean {
  return (
    length < JPEG_SEGMENT_MIN_LENGTH || offset + JPEG_SEGMENT_HEADER_BYTES + length > dataLength
  );
}

const IFD0_TAGS: Record<number, string> = {
  [TAG_MAKE]: 'Make',
  [TAG_MODEL]: 'Model',
  [TAG_ORIENTATION]: 'Orientation',
  [TAG_DATE_TIME]: 'DateTime'
};

/**
 * Determines whether the buffer starts with a JPEG SOI marker.
 * @param data - File bytes to inspect.
 * @returns True when the buffer looks like JPEG data; otherwise false.
 */
function isJpeg(data: Readonly<Buffer>): boolean {
  return (
    data.length >= JPEG_MIN_LENGTH &&
    data[0] === JPEG_SOI_PREFIX &&
    data[JPEG_MARKER_TYPE_OFFSET] === JPEG_SOI_MARKER
  );
}

/**
 * Parses supported ASCII fields from the TIFF IFD0 table.
 * @param tiff - TIFF payload bytes following the EXIF header.
 * @param ifdOffset - Offset of the IFD0 table within the TIFF payload.
 * @param readU16 - Helper for reading 16-bit values using the TIFF byte order.
 * @param readU32 - Helper for reading 32-bit values using the TIFF byte order.
 * @returns Extracted EXIF fields, or null when no supported fields are found.
 */
function parseIfd0Ascii(
  tiff: Readonly<Buffer>,
  ifdOffset: number,
  readU16: (offset: number) => number,
  readU32: (offset: number) => number
): Record<string, string> | null {
  if (ifdOffset <= 0 || ifdOffset + IFD_FIELD_COUNT_BYTES > tiff.length) return null;

  const fieldCount = readU16(ifdOffset);
  let values: Readonly<Record<string, string>> = {};

  for (let i = 0; i < fieldCount; i++) {
    const entryOffset = ifdOffset + IFD_FIELD_COUNT_BYTES + i * IFD_ENTRY_SIZE;
    if (entryOffset + IFD_ENTRY_SIZE > tiff.length) break;

    const nextValue = readIfd0AsciiField(tiff, entryOffset, readU16, readU32);
    if (nextValue) values = { ...values, ...nextValue };
  }

  return Object.keys(values).length > 0 ? values : null;
}

/**
 * Reads an ASCII EXIF field value from inline or offset TIFF storage.
 * @param tiff - TIFF payload bytes following the EXIF header.
 * @param valueOffsetFieldPos - Offset of the TIFF value-or-offset field.
 * @param length - Declared byte length of the ASCII field.
 * @param readU32 - Helper for reading 32-bit values using the TIFF byte order.
 * @returns The decoded ASCII value, or null when the value is invalid or empty.
 */
function readAsciiValue(
  tiff: Readonly<Buffer>,
  valueOffsetFieldPos: number,
  length: number,
  readU32: (offset: number) => number
): string | null {
  const start =
    length <= INLINE_VALUE_MAX_LENGTH ? valueOffsetFieldPos : readU32(valueOffsetFieldPos);
  if (start < 0 || start + length > tiff.length) return null;

  const value = ASCII_DECODER.decode(tiff.subarray(start, start + length))
    .replaceAll(NULL_CHAR, EMPTY_ASCII)
    .trim();

  return value.length > 0 ? value : null;
}

/**
 * Reads a supported ASCII field from one IFD0 entry.
 * @param tiff - TIFF payload bytes following the EXIF header.
 * @param entryOffset - IFD entry offset within the TIFF payload.
 * @param readU16 - Helper for reading 16-bit values using the TIFF byte order.
 * @param readU32 - Helper for reading 32-bit values using the TIFF byte order.
 * @returns Extracted field map or null when the entry is unsupported.
 */
function readIfd0AsciiField(
  tiff: Readonly<Buffer>,
  entryOffset: number,
  readU16: (offset: number) => number,
  readU32: (offset: number) => number
): Record<string, string> | null {
  const fieldName = IFD0_TAGS[readU16(entryOffset)];
  const fieldType = readU16(entryOffset + IFD_TYPE_OFFSET);
  const fieldLength = readU32(entryOffset + IFD_COUNT_OFFSET);
  if (!fieldName || fieldType !== FIELD_TYPE_ASCII || fieldLength <= 0) return null;

  const text = readAsciiValue(tiff, entryOffset + IFD_VALUE_OFFSET, fieldLength, readU32);
  return text ? { [fieldName]: text } : null;
}

/**
 * Reads a 16-bit unsigned integer in big-endian order.
 * @param tiff - TIFF payload bytes.
 * @param offset - Value offset.
 * @returns Decoded 16-bit value.
 */
function zReadU16BigEndian(tiff: Readonly<Buffer>, offset: number): number {
  return tiff.readUInt16BE(offset);
}

/**
 * Reads a 16-bit unsigned integer in little-endian order.
 * @param tiff - TIFF payload bytes.
 * @param offset - Value offset.
 * @returns Decoded 16-bit value.
 */
function zReadU16LittleEndian(tiff: Readonly<Buffer>, offset: number): number {
  return tiff.readUInt16LE(offset);
}

/**
 * Reads a 32-bit unsigned integer in big-endian order.
 * @param tiff - TIFF payload bytes.
 * @param offset - Value offset.
 * @returns Decoded 32-bit value.
 */
function zReadU32BigEndian(tiff: Readonly<Buffer>, offset: number): number {
  return tiff.readUInt32BE(offset);
}

/**
 * Reads a 32-bit unsigned integer in little-endian order.
 * @param tiff - TIFF payload bytes.
 * @param offset - Value offset.
 * @returns Decoded 32-bit value.
 */
function zReadU32LittleEndian(tiff: Readonly<Buffer>, offset: number): number {
  return tiff.readUInt32LE(offset);
}
