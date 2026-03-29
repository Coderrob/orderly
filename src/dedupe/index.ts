export { groupAllModeCandidates } from './dedupe-all-grouping.js';
export { groupAnyModeCandidates } from './dedupe-any-grouping.js';
export { createCandidatePairs, type IPathPair } from './dedupe-candidate-pairs.js';
export { DedupeStrategyFactory } from './dedupe-factory.js';
export { createDuplicatePairEvaluations } from './dedupe-duplicate-pair-evaluations.js';
export { groupCandidates } from './dedupe-group-resolution.js';
export {
  isDuplicateGroup,
  unionParents
} from './dedupe-grouping.js';
export {
  DedupeService,
} from './dedupe-service.js';
export {
  createDuplicatePairEvaluation,
  createFileIndexesByPath,
  findPairMatches,
  isDuplicatePair,
  isDuplicatePairEvaluation,
  toFileIndexEntry,
  toIndexPair,
  type IDuplicatePairEvaluation,
  type IPairMatchResult
} from './dedupe-pair-evaluation.js';
export {
  countApplicableStrategies,
  createMatchedPathPairMap,
  shouldCreateDuplicatePairEvaluation,
  type IResolvedPathPairMatch
} from './dedupe-path-pair-matches.js';
export {
  resolvePathPairIndexes,
  toDuplicatePairEvaluation
} from './dedupe-resolved-pair-evaluation.js';
export {
  createCandidate,
  createCandidatePromises,
  createStrategyExecutionPromises,
  executeSingleStrategy,
  executeStrategies,
  executeStrategy
} from './dedupe-strategy-execution.js';
export {
  appendIndexToRoot,
  buildDedupeResult,
  buildDuplicateGroup,
  buildReplaceActionOutcome,
  buildReportActionOutcome,
  buildSkipActionOutcome,
  buildStrategyExecution,
  createGroupIndexPairs,
  createIndexPairs,
  createInitialParents,
  createPairId,
  createPairMatchMap,
  getGroupFiles,
  getSecondaryFiles,
  getSuccessfulCandidates,
  getSuccessfulExecutions,
  getSupportedFiles,
  replaceParent,
  type IIndexPair,
  type IStrategyExecution,
  type IStrategyMatch
} from './dedupe-analysis.helpers.js';
export * from './hashers/index.js';
export type {
  IDedupeHasher,
  IDedupeReportWriter,
  IDedupeService,
  IDedupeStrategy,
  IMetadataExtractor
} from './interfaces.js';
export * from './metadata/index.js';
export * from './report/index.js';
export * from './strategies/index.js';
export {
  DedupeAction,
  DedupeMode,
  type IDedupeCandidate,
  type IDedupeConfig,
  type IDedupeError,
  type IDedupeOutcome,
  type IDedupeResult,
  type IDedupeStrategyConfig,
  type IDuplicateGroup,
  type IFileAttributes,
  type IFileProperties,
  type IImageDimensions
} from './types.js';
