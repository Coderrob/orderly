import { IScannedFile } from '../scanner/interfaces';

import {
  IDedupeResult,
  DedupeAction,
  IDedupeOutcome,
  IImageDimensions,
  IFileProperties,
  IFileAttributes
} from './types';

/**
 * Main dedupe orchestration service.
 * Coordinates strategies and applies actions.
 */
export interface IDedupeService {
  /**
   * Finds duplicate files using configured strategies.
   * @param files - Scanned files to check for duplicates
   * @returns Grouped duplicates with metadata
   */
  findDuplicates(files: readonly IScannedFile[]): Promise<IDedupeResult>;

  /**
   * Applies the configured action to duplicate groups.
   * @param result - Duplicate detection result
   * @param action - Action to apply (skip, report, replace)
   * @returns Outcome with affected files
   */
  applyAction(result: IDedupeResult, action: DedupeAction): Promise<IDedupeOutcome>;
}

/**
 * Strategy interface for duplicate detection.
 * Each strategy produces a comparable key for grouping.
 * Follows Strategy pattern for extensibility.
 */
export interface IDedupeStrategy {
  /** Unique strategy identifier */
  readonly name: string;

  /** Priority for execution order (lower = earlier) */
  readonly priority: number;

  /**
   * Checks if this strategy can process the file.
   * @param file - File to check
   * @returns True if strategy applies to this file type
   */
  canProcess(file: Readonly<IScannedFile>): boolean;

  /**
   * Generates a comparable key for the file.
   * Files with matching keys are potential duplicates.
   * @param file - File to generate key for
   * @returns Key string or null if unable to process
   */
  getKey(file: Readonly<IScannedFile>): Promise<string | null>;
}

/**
 * File content hashing interface.
 * Abstracted to allow different hashing implementations.
 */
export interface IDedupeHasher {
  /**
   * Computes SHA-256 hash of file contents.
   * @param filePath - Absolute path to file
   * @returns Hex-encoded hash string
   */
  sha256(filePath: string): Promise<string>;
}

/**
 * Metadata extraction interface.
 * Abstracted to support different metadata libraries.
 */
export interface IMetadataExtractor {
  /**
   * Extracts image dimensions from supported formats.
   */
  extractDimensions(filePath: string): Promise<IImageDimensions | null>;

  /**
   * Extracts EXIF data from images.
   */
  extractExif(filePath: string): Promise<Record<string, string> | null>;

  /**
   * Extracts file system properties (timestamps, owner).
   */
  extractProperties(filePath: string): Promise<IFileProperties | null>;

  /**
   * Extracts platform-specific file attributes.
   */
  extractAttributes(filePath: string): Promise<IFileAttributes | null>;
}

/**
 * Report generation interface.
 */
export interface IDedupeReportWriter {
  /**
   * Writes dedupe results to a report file.
   */
  write(result: IDedupeResult, outputPath: string): Promise<void>;

  /**
   * Writes markdown-formatted report.
   */
  writeMarkdown(result: IDedupeResult, outputPath: string): Promise<void>;
}
