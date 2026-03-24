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
export enum FileCategoryName {
  Images = 'images',
  Documents = 'documents',
  Videos = 'videos',
  Audio = 'audio',
  Archives = 'archives',
  Code = 'code'
}
