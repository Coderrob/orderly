import { promises as fs, Stats } from 'node:fs';
import { basename, extname, normalize } from 'node:path';

import { IMetadataExtractor } from '../interfaces';
import { IImageDimensions, IFileProperties, IFileAttributes } from '../types';

/**
 * Metadata extraction service.
 * Provides file metadata extraction capabilities for dedupe strategies.
 */
export class MetadataExtractor implements IMetadataExtractor {
  /**
   * Extracts image dimensions from supported formats.
   * Basic implementation - returns null for now.
   * @param _filePath
   */
  extractDimensions(_filePath: string): Promise<IImageDimensions | null> {
    // Basic implementation - could be enhanced with sharp/jimp
    return Promise.resolve(null);
  }

  /**
   * Extracts EXIF data from images.
   * Basic implementation - returns null for now.
   * @param _filePath
   */
  extractExif(_filePath: string): Promise<Record<string, string> | null> {
    // Basic implementation - could be enhanced with exif-parser/exifr
    return Promise.resolve(null);
  }

  /**
   * Extracts file system properties (timestamps, owner, mime type).
   * @param filePath
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
   * @param filePath
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
   * @param filePath
   */
  private isHiddenFile(filePath: string): boolean {
    const filename = basename(filePath);

    // Cross-platform hidden file detection
    if (filename.startsWith('.')) {
      return true;
    }

    // Windows-specific: check for hidden attribute
    // Note: This is a simplified check. Full implementation would need
    // to use Windows API or fs.constants
    return false;
  }

  /**
   * Determines if a file is a system file.
   * @param filePath
   * @param _stats
   * @param platform
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
   * @param stats
   */
  private isReadonlyFile(stats: Stats): boolean {
    // Check if file is writable by owner/group/others
    const mode = stats.mode;
    return (mode & 0o200) === 0; // Check if owner has write permission
  }

  /**
   * Gets MIME type from file extension.
   * Basic implementation - could be enhanced with a proper MIME type library.
   * @param filePath
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
}
