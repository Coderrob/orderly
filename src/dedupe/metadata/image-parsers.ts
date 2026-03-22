import { IImageDimensions } from '../types';

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

export function extractImageDimensions(data: Buffer): IImageDimensions | null {
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

function extractPngDimensions(data: Buffer): IImageDimensions | null {
  if (!isPngWithIhdr(data)) return null;

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width === 0 || height === 0) return null;

  return { width, height };
}

function isPngWithIhdr(data: Buffer): boolean {
  if (data.length < 24) return false;

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < pngSignature.length; i++) {
    if (data[i] !== pngSignature[i]) return false;
  }

  return data.toString('ascii', 12, 16) === 'IHDR';
}

function extractJpegDimensions(data: Buffer): IImageDimensions | null {
  if (!isJpeg(data)) return null;

  let offset = 2;
  while (offset + 9 < data.length) {
    const markerOffset = seekMarker(data, offset);
    if (markerOffset < 0) return null;

    const marker = data[markerOffset + 1];
    if (isJpegStopMarker(marker)) return null;

    const segmentLength = getSegmentLength(data, markerOffset);
    if (segmentLength < 2) return null;

    if (SOF_MARKERS.has(marker)) {
      return readSofDimensions(data, markerOffset);
    }

    offset = markerOffset + 2 + segmentLength;
  }

  return null;
}

function seekMarker(data: Buffer, start: number): number {
  for (let i = start; i + 1 < data.length; i++) {
    if (data[i] === 0xff) return i;
  }
  return -1;
}

function readSofDimensions(data: Buffer, markerOffset: number): IImageDimensions | null {
  if (markerOffset + 9 >= data.length) return null;

  const height = data.readUInt16BE(markerOffset + 5);
  const width = data.readUInt16BE(markerOffset + 7);
  if (width <= 0 || height <= 0) return null;

  return { width, height };
}

function getSegmentLength(data: Buffer, markerOffset: number): number {
  if (markerOffset + 4 > data.length) return -1;

  const segmentLength = data.readUInt16BE(markerOffset + 2);
  if (markerOffset + 2 + segmentLength > data.length) return -1;

  return segmentLength;
}

function isJpeg(data: Buffer): boolean {
  return data.length >= 4 && data[0] === 0xff && data[1] === 0xd8;
}

function isJpegStopMarker(marker: number): boolean {
  return marker === 0xd9 || marker === 0xda;
}

function extractGifDimensions(data: Buffer): IImageDimensions | null {
  if (data.length < 10) return null;

  const header = data.toString('ascii', 0, 6);
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;

  const width = data.readUInt16LE(6);
  const height = data.readUInt16LE(8);
  if (width === 0 || height === 0) return null;

  return { width, height };
}

function extractBmpDimensions(data: Buffer): IImageDimensions | null {
  if (data.length < 26 || data[0] !== 0x42 || data[1] !== 0x4d) return null;

  const dibHeaderSize = data.readUInt32LE(14);
  if (dibHeaderSize < 40) return null;

  const width = Math.abs(data.readInt32LE(18));
  const height = Math.abs(data.readInt32LE(22));
  if (width <= 0 || height <= 0) return null;

  return { width, height };
}
