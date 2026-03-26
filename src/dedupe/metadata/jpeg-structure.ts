enum JpegByte {
  Prefix = 0xff
}

enum JpegMarker {
  StartOfImage = 0xd8,
  EndOfImage = 0xd9,
  StartOfScan = 0xda
}

const JPEG_MIN_SIGNATURE_BYTES = 2;
const JPEG_MIN_HEADER_BYTES = 4;
const JPEG_MARKER_TYPE_OFFSET = 1;
const JPEG_SEGMENT_LENGTH_OFFSET = 2;
const JPEG_SEGMENT_MIN_LENGTH = 2;
const JPEG_SEGMENT_HEADER_BYTES = 2;

/**
 * Determines whether the buffer starts with a JPEG SOI marker.
 * @param data - File bytes to inspect.
 * @returns True when the buffer looks like JPEG data; otherwise false.
 */
export function isJpeg(data: Readonly<Buffer>): boolean {
  return (
    data.length >= JPEG_MIN_SIGNATURE_BYTES &&
    data[0] === Number(JpegByte.Prefix) &&
    data[JPEG_MARKER_TYPE_OFFSET] === Number(JpegMarker.StartOfImage)
  );
}

/**
 * Determines whether the JPEG marker ends metadata scanning.
 * @param marker - Marker byte following the `0xFF` prefix.
 * @returns True when the marker is SOS or EOI; otherwise false.
 */
export function isJpegStopMarker(marker: number): boolean {
  return marker === Number(JpegMarker.EndOfImage) || marker === Number(JpegMarker.StartOfScan);
}

/**
 * Returns the marker byte at a marker offset.
 * @param data - JPEG bytes.
 * @param markerOffset - Offset of the `0xFF` marker prefix.
 * @returns Marker byte.
 */
export function readJpegMarker(data: Readonly<Buffer>, markerOffset: number): number {
  return data[markerOffset + JPEG_MARKER_TYPE_OFFSET];
}

/**
 * Reads a JPEG segment length when the segment is fully available.
 * @param data - JPEG bytes.
 * @param markerOffset - Offset of the `0xFF` marker prefix.
 * @returns The segment length, or `-1` when invalid or incomplete.
 */
export function readJpegSegmentLength(data: Readonly<Buffer>, markerOffset: number): number {
  if (markerOffset + JPEG_MIN_HEADER_BYTES > data.length) {
    return -1;
  }

  const segmentLength = data.readUInt16BE(markerOffset + JPEG_SEGMENT_LENGTH_OFFSET);
  if (
    segmentLength < JPEG_SEGMENT_MIN_LENGTH ||
    markerOffset + JPEG_SEGMENT_HEADER_BYTES + segmentLength > data.length
  ) {
    return -1;
  }

  return segmentLength;
}

export const JPEG_SEGMENT_HEADER_SIZE = JPEG_SEGMENT_HEADER_BYTES;
export const JPEG_SEGMENT_PAYLOAD_OFFSET = JPEG_MIN_HEADER_BYTES;
export const JPEG_START_OFFSET = JPEG_SEGMENT_HEADER_BYTES;
