import { ReadonlyExtensionList, IFileCategory } from './types';

export const IMAGE_EXTENSIONS: ReadonlyExtensionList = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.bmp',
  '.tiff',
  '.tif'
] as const;

export const DOCUMENT_EXTENSIONS: ReadonlyExtensionList = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.odt',
  '.rtf',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx'
] as const;

export const VIDEO_EXTENSIONS: ReadonlyExtensionList = [
  '.mp4',
  '.avi',
  '.mkv',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.3gp'
] as const;

export const AUDIO_EXTENSIONS: ReadonlyExtensionList = [
  '.mp3',
  '.wav',
  '.flac',
  '.aac',
  '.ogg',
  '.wma',
  '.m4a',
  '.opus'
] as const;

export const ARCHIVE_EXTENSIONS: ReadonlyExtensionList = [
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.bz2',
  '.xz',
  '.tgz',
  '.tbz2'
] as const;

export const CODE_EXTENSIONS: ReadonlyExtensionList = [
  '.js',
  '.ts',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.cs',
  '.go',
  '.rs',
  '.php',
  '.rb',
  '.swift',
  '.kt',
  '.scala',
  '.clj',
  '.hs',
  '.ml',
  '.fs',
  '.vb',
  '.lua',
  '.pl',
  '.r'
] as const;

/**
 * Default file categories with type safety.
 */
export const DEFAULT_CATEGORIES: readonly IFileCategory[] = [
  { name: 'images', extensions: IMAGE_EXTENSIONS, targetFolder: 'images' },
  { name: 'documents', extensions: DOCUMENT_EXTENSIONS, targetFolder: 'documents' },
  { name: 'videos', extensions: VIDEO_EXTENSIONS, targetFolder: 'videos' },
  { name: 'audio', extensions: AUDIO_EXTENSIONS, targetFolder: 'audio' },
  { name: 'archives', extensions: ARCHIVE_EXTENSIONS, targetFolder: 'archives' },
  { name: 'code', extensions: CODE_EXTENSIONS, targetFolder: 'code' }
] as const;
