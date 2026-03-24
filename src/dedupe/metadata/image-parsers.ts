import { IImageDimensions } from '../types';

const BITMAP_MIN_LENGTH = 26;
const BITMAP_SIGNATURE_B = 0x42;
const BITMAP_SIGNATURE_M = 0x4d;
const BITMAP_DIB_HEADER_OFFSET = 14;
const BITMAP_MIN_DIB_HEADER_SIZE = 40;
const BITMAP_WIDTH_OFFSET = 18;
const BITMAP_HEIGHT_OFFSET = 22;

const GIF_MIN_LENGTH = 10;
const GIF_HEADER_LENGTH = 6;
const GIF_WIDTH_OFFSET = 6;
const GIF_HEIGHT_OFFSET = 8;
const GIF_HEADER_87A = Buffer.from('GIF87a', 'ascii');
const GIF_HEADER_89A = Buffer.from('GIF89a', 'ascii');

const JPEG_MIN_LENGTH = 4;
const JPEG_SOI_PREFIX = 0xff;
const JPEG_SOI_MARKER = 0xd8;
const JPEG_EOI_MARKER = 0xd9;
const JPEG_SOS_MARKER = 0xda;
const JPEG_INITIAL_OFFSET = 2;
const JPEG_MARKER_TYPE_OFFSET = 1;
const JPEG_SEGMENT_LENGTH_OFFSET = 2;
const JPEG_SEGMENT_MIN_LENGTH = 2;
const JPEG_SEGMENT_HEADER_BYTES = 2;
const JPEG_DIMENSION_LOOKAHEAD_BYTES = 9;
const JPEG_SOF_HEIGHT_OFFSET = 5;
const JPEG_SOF_WIDTH_OFFSET = 7;

const PNG_MIN_LENGTH = 24;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const PNG_IHDR_START = 12;
const PNG_IHDR_END = 16;
const PNG_SIGNATURE_BYTE_1 = 0x89;
const PNG_SIGNATURE_BYTE_2 = 0x50;
const PNG_SIGNATURE_BYTE_3 = 0x4e;
const PNG_SIGNATURE_BYTE_4 = 0x47;
const PNG_SIGNATURE_BYTE_5 = 0x0d;
const PNG_SIGNATURE_BYTE_6 = 0x0a;
const PNG_SIGNATURE_BYTE_7 = 0x1a;
const PNG_SIGNATURE_BYTE_8 = 0x0a;
const PNG_SIGNATURE = Buffer.from([
  PNG_SIGNATURE_BYTE_1,
  PNG_SIGNATURE_BYTE_2,
  PNG_SIGNATURE_BYTE_3,
  PNG_SIGNATURE_BYTE_4,
  PNG_SIGNATURE_BYTE_5,
  PNG_SIGNATURE_BYTE_6,
  PNG_SIGNATURE_BYTE_7,
  PNG_SIGNATURE_BYTE_8
]);
const PNG_IHDR = Buffer.from('IHDR', 'ascii');

const SOF_0 = 0xc0;
const SOF_1 = 0xc1;
const SOF_2 = 0xc2;
const SOF_3 = 0xc3;
const SOF_5 = 0xc5;
const SOF_6 = 0xc6;
const SOF_7 = 0xc7;
const SOF_9 = 0xc9;
const SOF_10 = 0xca;
const SOF_11 = 0xcb;
const SOF_13 = 0xcd;
const SOF_14 = 0xce;
const SOF_15 = 0xcf;
const SOF_MARKERS = new Set([
  SOF_0,
  SOF_1,
  SOF_2,
  SOF_3,
  SOF_5,
  SOF_6,
  SOF_7,
  SOF_9,
  SOF_10,
  SOF_11,
  SOF_13,
  SOF_14,
  SOF_15
]);

/**
 * Extracts dimensions from a GIF header when present.
 * @param data - File bytes to inspect.
 * @returns Image dimensions, or null when the buffer is not a valid GIF header.
 */
function extractBmpDimensions(data: Readonly<Buffer>): IImageDimensions | null {
  if (
    data.length < BITMAP_MIN_LENGTH ||
    data[0] !== BITMAP_SIGNATURE_B ||
    data[JPEG_MARKER_TYPE_OFFSET] !== BITMAP_SIGNATURE_M
  ) {
    return null;
  }

  const dibHeaderSize = data.readUInt32LE(BITMAP_DIB_HEADER_OFFSET);
  if (dibHeaderSize < BITMAP_MIN_DIB_HEADER_SIZE) return null;

  const width = Math.abs(data.readInt32LE(BITMAP_WIDTH_OFFSET));
  const height = Math.abs(data.readInt32LE(BITMAP_HEIGHT_OFFSET));
  if (width <= 0 || height <= 0) return null;

  return { width, height };
}

/**
 * Attempts each supported parser until image dimensions are found.
 * @param data - File bytes to inspect.
 * @returns Image dimensions, or null when the format is unsupported or incomplete.
 */
function extractGifDimensions(data: Readonly<Buffer>): IImageDimensions | null {
  if (data.length < GIF_MIN_LENGTH) return null;

  const header = data.subarray(0, GIF_HEADER_LENGTH);
  if (!header.equals(GIF_HEADER_87A) && !header.equals(GIF_HEADER_89A)) return null;

  const width = data.readUInt16LE(GIF_WIDTH_OFFSET);
  const height = data.readUInt16LE(GIF_HEIGHT_OFFSET);
  if (width === 0 || height === 0) return null;

  return { width, height };
}

/**
 * Extracts dimensions from a BMP header when present.
 * @param data - File bytes to inspect.
 * @returns Image dimensions, or null when the buffer is not a supported BMP header.
 */
export function extractImageDimensions(data: Readonly<Buffer>): IImageDimensions | null {
  const parsers = [
    extractPngDimensions,
    extractJpegDimensions,
    extractGifDimensions,
    extractBmpDimensions
  ];
  for (const parse of parsers) {
    const result = parse(data);
    if (result) return result;
  }
  return null;
}

/**
 * Extracts dimensions from a JPEG Start Of Frame segment.
 * @param data - File bytes to inspect.
 * @returns Image dimensions, or null when no supported SOF segment is found.
 */
function extractJpegDimensions(data: Readonly<Buffer>): IImageDimensions | null {
  if (!isJpeg(data)) return null;

  let offset = JPEG_INITIAL_OFFSET;
  while (offset + JPEG_DIMENSION_LOOKAHEAD_BYTES < data.length) {
    const markerOffset = seekMarker(data, offset);
    if (markerOffset < 0) return null;
    const marker = data[markerOffset + JPEG_MARKER_TYPE_OFFSET];
    if (isJpegStopMarker(marker)) return null;
    const segmentLength = getSegmentLength(data, markerOffset);
    if (segmentLength < JPEG_SEGMENT_MIN_LENGTH) return null;
    if (SOF_MARKERS.has(marker)) return readSofDimensions(data, markerOffset);

    offset = markerOffset + JPEG_SEGMENT_HEADER_BYTES + segmentLength;
  }

  return null;
}

/**
 * Extracts dimensions from a PNG IHDR chunk when present.
 * @param data - File bytes to inspect.
 * @returns Image dimensions, or null when the buffer is not a valid PNG IHDR prefix.
 */
function extractPngDimensions(data: Readonly<Buffer>): IImageDimensions | null {
  if (!isPngWithIhdr(data)) return null;

  const width = data.readUInt32BE(PNG_WIDTH_OFFSET);
  const height = data.readUInt32BE(PNG_HEIGHT_OFFSET);
  if (width === 0 || height === 0) return null;

  return { width, height };
}

/**
 * Reads the declared JPEG segment length for the marker at the provided offset.
 * @param data - File bytes to inspect.
 * @param markerOffset - Offset of the JPEG marker prefix byte.
 * @returns The segment length, or `-1` when the segment is incomplete or invalid.
 */
function getSegmentLength(data: Readonly<Buffer>, markerOffset: number): number {
  if (markerOffset + JPEG_MIN_LENGTH > data.length) return -1;

  const segmentLength = data.readUInt16BE(markerOffset + JPEG_SEGMENT_LENGTH_OFFSET);
  if (markerOffset + JPEG_SEGMENT_HEADER_BYTES + segmentLength > data.length) return -1;

  return segmentLength;
}

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
 * Determines whether the JPEG marker ends metadata scanning.
 * @param marker - Marker byte following the `0xFF` prefix.
 * @returns True when the marker is SOS or EOI; otherwise false.
 */
function isJpegStopMarker(marker: number): boolean {
  return marker === JPEG_EOI_MARKER || marker === JPEG_SOS_MARKER;
}

/**
 * Determines whether the buffer starts with a PNG signature followed by an IHDR chunk.
 * @param data - File bytes to inspect.
 * @returns True when the buffer contains the PNG signature and IHDR marker; otherwise false.
 */
function isPngWithIhdr(data: Readonly<Buffer>): boolean {
  return (
    data.length >= PNG_MIN_LENGTH &&
    data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) &&
    data.subarray(PNG_IHDR_START, PNG_IHDR_END).equals(PNG_IHDR)
  );
}

/**
 * Reads image dimensions from a JPEG Start Of Frame segment.
 * @param data - File bytes to inspect.
 * @param markerOffset - Offset of the SOF marker prefix byte.
 * @returns Image dimensions, or null when the SOF segment is incomplete or invalid.
 */
function readSofDimensions(data: Readonly<Buffer>, markerOffset: number): IImageDimensions | null {
  if (markerOffset + JPEG_DIMENSION_LOOKAHEAD_BYTES >= data.length) return null;

  const height = data.readUInt16BE(markerOffset + JPEG_SOF_HEIGHT_OFFSET);
  const width = data.readUInt16BE(markerOffset + JPEG_SOF_WIDTH_OFFSET);
  if (width <= 0 || height <= 0) return null;

  return { width, height };
}

/**
 * Seeks the next JPEG marker prefix starting at the provided offset.
 * @param data - File bytes to inspect.
 * @param start - Offset to begin searching from.
 * @returns The marker offset, or `-1` when no marker prefix is found.
 */
function seekMarker(data: Readonly<Buffer>, start: number): number {
  for (let i = start; i + 1 < data.length; i++) {
    if (data[i] === JPEG_SOI_PREFIX) return i;
  }
  return -1;
}
