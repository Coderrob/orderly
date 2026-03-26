import { IImageDimensions } from '../types';

import {
  isJpeg,
  isJpegStopMarker,
  JPEG_SEGMENT_HEADER_SIZE,
  JPEG_START_OFFSET,
  readJpegMarker,
  readJpegSegmentLength
} from './jpeg-structure';

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

enum JpegByte {
  MarkerPrefix = 0xff
}

enum JpegStartOfFrameMarker {
  BaselineDct = 0xc0,
  ExtendedSequentialDct = 0xc1,
  ProgressiveDct = 0xc2,
  LosslessSequential = 0xc3,
  DifferentialSequentialDct = 0xc5,
  DifferentialProgressiveDct = 0xc6,
  DifferentialLossless = 0xc7,
  ExtendedSequentialArithmetic = 0xc9,
  ProgressiveArithmetic = 0xca,
  LosslessArithmetic = 0xcb,
  DifferentialSequentialArithmetic = 0xcd,
  DifferentialProgressiveArithmetic = 0xce,
  DifferentialLosslessArithmetic = 0xcf
}

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

const SOF_MARKERS = new Set([
  JpegStartOfFrameMarker.BaselineDct,
  JpegStartOfFrameMarker.ExtendedSequentialDct,
  JpegStartOfFrameMarker.ProgressiveDct,
  JpegStartOfFrameMarker.LosslessSequential,
  JpegStartOfFrameMarker.DifferentialSequentialDct,
  JpegStartOfFrameMarker.DifferentialProgressiveDct,
  JpegStartOfFrameMarker.DifferentialLossless,
  JpegStartOfFrameMarker.ExtendedSequentialArithmetic,
  JpegStartOfFrameMarker.ProgressiveArithmetic,
  JpegStartOfFrameMarker.LosslessArithmetic,
  JpegStartOfFrameMarker.DifferentialSequentialArithmetic,
  JpegStartOfFrameMarker.DifferentialProgressiveArithmetic,
  JpegStartOfFrameMarker.DifferentialLosslessArithmetic
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
    data[1] !== BITMAP_SIGNATURE_M
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

  let offset = JPEG_START_OFFSET;
  while (offset + JPEG_DIMENSION_LOOKAHEAD_BYTES <= data.length) {
    const markerOffset = seekMarker(data, offset);
    if (markerOffset < 0) return null;
    const marker = readJpegMarker(data, markerOffset);
    if (isJpegStopMarker(marker)) return null;
    const segmentLength = readJpegSegmentLength(data, markerOffset);
    if (segmentLength < 0) return null;
    if (SOF_MARKERS.has(marker)) return readSofDimensions(data, markerOffset);

    offset = markerOffset + JPEG_SEGMENT_HEADER_SIZE + segmentLength;
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
  if (markerOffset + JPEG_DIMENSION_LOOKAHEAD_BYTES > data.length) return null;

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
    if (data[i] === Number(JpegByte.MarkerPrefix)) return i;
  }
  return -1;
}
