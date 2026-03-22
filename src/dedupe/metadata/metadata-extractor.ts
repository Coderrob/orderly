import { promises as fs, Stats } from 'node:fs';
import { basename, extname, normalize } from 'node:path';

import { IMetadataExtractor } from '../interfaces';
import { IImageDimensions, IFileProperties, IFileAttributes } from '../types';

import { extractImageDimensions } from './image-parsers';
import { extractExifFromJpeg } from './jpeg-exif-parser';

const BASIC_IMAGE_HEADER_BYTES = 64;
const JPEG_METADATA_CHUNK_BYTES = 64 * 1024;
const MAX_JPEG_METADATA_BYTES = 1024 * 1024;

/**
 * Metadata extraction service.
 * Provides file metadata extraction capabilities for dedupe strategies.
 */
export class MetadataExtractor implements IMetadataExtractor {
  /**
   * Extracts image dimensions from supported formats.
   * Supports PNG, JPEG, GIF, and BMP.
   * @param filePath - Path to the image file whose dimensions should be read.
   * @returns The extracted width and height, or null when dimensions cannot be determined.
   */
  async extractDimensions(filePath: string): Promise<IImageDimensions | null> {
    try {
      return await this.extractWithProgressiveRead(filePath, extractImageDimensions);
    } catch {
      return null;
    }
  }

  /**
   * Extracts EXIF data from images.
   * Supports JPEG APP1 EXIF blocks.
   * @param filePath - Path to the image file whose EXIF metadata should be read.
   * @returns A map of extracted EXIF fields, or null when EXIF data is unavailable.
   */
  async extractExif(filePath: string): Promise<Record<string, string> | null> {
    try {
      return await this.extractWithProgressiveRead(filePath, extractExifFromJpeg);
    } catch {
      return null;
    }
  }

  /**
   * Extracts file system properties (timestamps, owner, mime type).
   * @param filePath - Path to the file whose properties should be read.
   * @returns File property metadata, or null when the file cannot be read.
   */
  async extractProperties(filePath: string): Promise<IFileProperties | null> {
    try {
      const stats = await fs.stat(filePath);

      // Get MIME type from extension (basic implementation)
      const mimeType = this.getMimeTypeFromExtension(filePath);

      return {
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        // Note: owner information requires additional system calls
        // and may not be available on all platforms
        mimeType
      };
    } catch {
      // Return null on any error
      return null;
    }
  }

  /**
   * Extracts platform-specific file attributes.
   * @param filePath - Path to the file whose attributes should be read.
   * @returns File attribute metadata, or null when the file cannot be read.
   */
  async extractAttributes(filePath: string): Promise<IFileAttributes | null> {
    try {
      const stats = await fs.stat(filePath);

      // On Windows, check for hidden/system attributes
      // On Unix-like systems, check for dot-files and permissions
      const isHidden = this.isHiddenFile(filePath);
      const isSystem = this.isSystemFile(filePath, stats);
      const isReadonly = this.isReadonlyFile(stats);

      return {
        readonly: isReadonly,
        hidden: isHidden,
        system: isSystem
      };
    } catch {
      // Return null on any error
      return null;
    }
  }

  /**
   * Determines if a file is hidden based on platform conventions.
   * @param filePath - Path to evaluate.
   * @returns True when the filename follows hidden-file conventions; otherwise false.
   */
  private isHiddenFile(filePath: string): boolean {
    const filename = basename(filePath);

    // Cross-platform hidden file detection
    return !!filename.startsWith('.');
  }

  /**
   * Determines if a file is a system file.
   * @param filePath - Path to evaluate.
   * @param _stats - File stats for the evaluated path.
   * @param platform - Platform name used to apply platform-specific heuristics.
   * @returns True when the path appears to represent a system file; otherwise false.
   */
  private isSystemFile(
    filePath: string,
    _stats: Stats,
    platform: string = process.platform
  ): boolean {
    if (platform === 'win32') {
      // On Windows, system files have specific attributes
      // For now, simplified implementation
      return false;
    } else {
      // On Unix-like systems, check if path is in system directories
      const systemPaths = ['/sys', '/proc', '/dev'];
      const normalizedPath = normalize(filePath).replaceAll('\\', '/');
      return systemPaths.some(sysPath => normalizedPath.includes(sysPath));
    }
  }

  /**
   * Determines if a file is read-only.
   * @param stats - File stats containing permission bits.
   * @returns True when the owner write bit is not present; otherwise false.
   */
  private isReadonlyFile(stats: Stats): boolean {
    // Check if file is writable by owner/group/others
    const mode = stats.mode;
    return (mode & 0o200) === 0; // Check if owner has write permission
  }

  /**
   * Gets MIME type from file extension.
   * Basic implementation - could be enhanced with a proper MIME type library.
   * @param filePath - Path whose extension should be mapped to a MIME type.
   * @returns The resolved MIME type, or application/octet-stream when unknown.
   */
  private getMimeTypeFromExtension(filePath: string): string {
    const ext = extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Reads only the required prefix for metadata extraction, expanding for JPEGs
   * until the requested data is found or the bounded scan limit is reached.
   * @param filePath - Path to the file being read.
   * @param extract - Metadata extraction callback applied to each progressively larger buffer.
   * @returns The extracted metadata value, or null when extraction fails.
   */
  private async extractWithProgressiveRead<T>(
    filePath: string,
    extract: (data: Buffer) => T | null
  ): Promise<T | null> {
    const handle = await fs.open(filePath, 'r');

    try {
      let bytesToRead = BASIC_IMAGE_HEADER_BYTES;
      let buffer = await this.readFilePrefix(handle, bytesToRead);
      const initialResult = extract(buffer);
      if (initialResult) {
        return initialResult;
      }

      if (!this.isJpeg(buffer)) {
        return null;
      }

      while (buffer.length < MAX_JPEG_METADATA_BYTES) {
        bytesToRead = Math.min(bytesToRead + JPEG_METADATA_CHUNK_BYTES, MAX_JPEG_METADATA_BYTES);
        const nextBuffer = await this.readFilePrefix(handle, bytesToRead);

        if (nextBuffer.length === buffer.length) {
          return extract(nextBuffer);
        }

        buffer = nextBuffer;
        const result = extract(buffer);
        if (result) {
          return result;
        }
      }

      return extract(buffer);
    } finally {
      await handle.close();
    }
  }

  /**
   * Reads up to maxBytes from the beginning of a file handle.
   * @param handle - Open file handle to read from.
   * @param maxBytes - Maximum number of bytes to read from the start of the file.
   * @returns A buffer containing only the bytes that were actually read.
   */
  private async readFilePrefix(handle: fs.FileHandle, maxBytes: number): Promise<Buffer> {
    const buffer = Buffer.allocUnsafe(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead);
  }

  /**
   * Determines if the buffer starts with a JPEG header.
   * @param data - Buffer prefix to inspect.
   * @returns True when the buffer begins with the JPEG SOI marker; otherwise false.
   */
  private isJpeg(data: Buffer): boolean {
    return data.length >= 2 && data[0] === 0xff && data[1] === 0xd8;
  }
}
