/**
 * Readonly type for immutable constant arrays.
 */
export type ReadonlyExtensionList = readonly string[];

/**
 * File category definition interface.
 */
export interface IFileCategory {
  readonly name: string;
  readonly extensions: ReadonlyExtensionList;
  readonly targetFolder: string;
}

/**
 * All supported file categories.
 */
export type FileCategoryName = 'images' | 'documents' | 'videos' | 'audio' | 'archives' | 'code';
