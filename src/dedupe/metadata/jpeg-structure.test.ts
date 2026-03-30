import {
  findJpegMarkerOffset,
  isJpeg,
  isJpegStopMarker,
  JPEG_SEGMENT_HEADER_SIZE,
  JPEG_SEGMENT_PAYLOAD_OFFSET,
  JPEG_START_OFFSET,
  readJpegMarker,
  readJpegSegmentLength
} from './jpeg-structure';

describe('jpeg-structure', () => {
  describe('isJpeg', () => {
    it('should return true for JPEG data with an SOI marker', () => {
      expect(isJpeg(Buffer.from([0xff, 0xd8]))).toBe(true);
    });

    it('should return false for buffers shorter than an SOI marker', () => {
      expect(isJpeg(Buffer.from([0xff]))).toBe(false);
    });

    it('should return false for non-JPEG signatures', () => {
      expect(isJpeg(Buffer.from([0xff, 0xd9]))).toBe(false);
    });
  });

  describe('isJpegStopMarker', () => {
    it('should return true for end-of-image markers', () => {
      expect(isJpegStopMarker(0xd9)).toBe(true);
    });

    it('should return true for start-of-scan markers', () => {
      expect(isJpegStopMarker(0xda)).toBe(true);
    });

    it('should return false for non-stop markers', () => {
      expect(isJpegStopMarker(0xe1)).toBe(false);
    });
  });

  describe('findJpegMarkerOffset', () => {
    it('should return the first marker offset from the requested start', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0x01, 0x02, 0xff, 0xe1]);

      expect(findJpegMarkerOffset(jpeg, JPEG_START_OFFSET)).toBe(4);
    });

    it('should collapse repeated fill bytes to the real marker prefix', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xff, 0xe1]);

      expect(findJpegMarkerOffset(jpeg, JPEG_START_OFFSET)).toBe(3);
    });

    it('should skip stuffed bytes and continue scanning to the next marker', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0xff, 0xe1]);

      expect(findJpegMarkerOffset(jpeg, JPEG_START_OFFSET)).toBe(5);
    });

    it('should return -1 when no marker follows the start offset', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0x01, 0x02, 0x03]);

      expect(findJpegMarkerOffset(jpeg, JPEG_START_OFFSET)).toBe(-1);
    });
  });

  describe('readJpegMarker', () => {
    it('should return the marker byte at the provided prefix offset', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1]);

      expect(readJpegMarker(jpeg, JPEG_START_OFFSET)).toBe(0xe1);
    });
  });

  describe('readJpegSegmentLength', () => {
    it('should return the segment length when the full segment is available', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0x00, 0x00]);

      expect(readJpegSegmentLength(jpeg, JPEG_START_OFFSET)).toBe(4);
    });

    it('should return -1 when the segment header is incomplete', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff]);

      expect(readJpegSegmentLength(jpeg, JPEG_START_OFFSET)).toBe(-1);
    });

    it('should return -1 when the declared segment length is smaller than the minimum', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x01, 0x00, 0x00]);

      expect(readJpegSegmentLength(jpeg, JPEG_START_OFFSET)).toBe(-1);
    });

    it('should return -1 when the declared segment extends past the buffer', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x00, 0x00]);

      expect(readJpegSegmentLength(jpeg, JPEG_START_OFFSET)).toBe(-1);
    });
  });

  describe('constants', () => {
    it('should expose the expected marker layout offsets', () => {
      expect(JPEG_SEGMENT_HEADER_SIZE).toBe(2);
      expect(JPEG_SEGMENT_PAYLOAD_OFFSET).toBe(4);
      expect(JPEG_START_OFFSET).toBe(2);
    });
  });
});
