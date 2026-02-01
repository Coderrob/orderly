export { DedupeService } from './dedupe-service.js';
export * from './hashers/index.js';
export type {
  IDedupeHasher,
  IDedupeReportWriter,
  IDedupeService,
  IDedupeStrategy,
  IMetadataExtractor
} from './interfaces.js';
export * from './metadata/index.js';
export * from './strategies/index.js';
export { DedupeAction, DedupeMode } from './types.js';
export type {
  IDedupeCandidate,
  IDedupeConfig,
  IDedupeError,
  IDedupeOutcome,
  IDedupeResult,
  IDedupeStrategyConfig,
  IDuplicateGroup,
  IFileAttributes,
  IFileProperties,
  IImageDimensions
} from './types.js';
