import { IScannedFile } from '../scanner/interfaces';

/**
 * Actions that can be taken on detected duplicates.
 */
export enum DedupeAction {
  /** Remove duplicates from operation queue */
  SKIP = 'skip',
  /** Generate report without modifying operations */
  REPORT = 'report',
  /** Keep primary, schedule duplicates for deletion */
  REPLACE = 'replace'
}

/**
 * Strategy composition mode.
 */
export enum DedupeMode {
  /** All enabled strategies must match (AND) */
  ALL = 'all',
  /** Any enabled strategy match counts (OR) */
  ANY = 'any'
}

/**
 * Strategy-specific configuration options.
 */
export interface IDedupeStrategyConfig {
  mode: DedupeMode;
  name?: { caseSensitive: boolean; ignoreExtension: boolean };
  size?: boolean;
  imageDimensions?: boolean;
  sha256?: boolean;
  fileProperties?: boolean;
  fileAttributes?: boolean;
  exif?: boolean;
}

/**
 * Full dedupe configuration.
 */
export interface IDedupeConfig {
  enabled: boolean;
  recursive: boolean;
  strategy: IDedupeStrategyConfig;
  action: DedupeAction;
}

/**
 * Image dimension metadata.
 */
export interface IImageDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * File system properties.
 */
export interface IFileProperties {
  readonly createdAt?: Date;
  readonly modifiedAt?: Date;
  readonly owner?: string;
  readonly mimeType?: string;
}

/**
 * Platform-specific file attributes.
 */
export interface IFileAttributes {
  readonly readonly?: boolean;
  readonly hidden?: boolean;
  readonly system?: boolean;
}

/**
 * A file paired with its computed dedupe key.
 */
export interface IDedupeCandidate {
  readonly file: IScannedFile;
  readonly key: string;
  readonly strategy: string;
}

/**
 * A group of files sharing the same dedupe key.
 */
export interface IDuplicateGroup {
  readonly key: string;
  readonly strategy: string;
  readonly files: readonly IScannedFile[];
  readonly primary?: IScannedFile;
}

/**
 * Result of duplicate detection.
 */
export interface IDedupeResult {
  readonly groups: readonly IDuplicateGroup[];
  readonly totalFiles: number;
  readonly totalDuplicates: number;
  readonly strategiesUsed: readonly string[];
}

/**
 * Outcome after applying dedupe action.
 */
export interface IDedupeOutcome {
  readonly action: DedupeAction;
  readonly skipped: readonly IScannedFile[];
  readonly replaced: readonly IScannedFile[];
  readonly reported: readonly IDuplicateGroup[];
  readonly errors: readonly IDedupeError[];
}

/**
 * Dedupe-specific error information.
 */
export interface IDedupeError {
  readonly file: string;
  readonly strategy: string;
  readonly error: string;
}
