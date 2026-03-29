import { IScannedFile } from '../scanner/interfaces';

import { IDedupeStrategy } from './interfaces';
import {
  DedupeAction,
  IDedupeCandidate,
  IDedupeOutcome,
  IDedupeResult,
  IDuplicateGroup
} from './types';

interface IStrategyExecution {
  readonly strategy: string;
  readonly keysByPath: ReadonlyMap<string, string>;
}

interface IStrategyMatch {
  readonly strategy: string;
  readonly key: string;
}

interface IIndexPair {
  readonly leftIndex: number;
  readonly rightIndex: number;
}

const DUPLICATE_OFFSET = 1;

export type { IIndexPair, IStrategyExecution, IStrategyMatch };

/**
 * Adds one file index to the grouped-root accumulator.
 * @param groupedRoots - Existing grouped roots.
 * @param root - Duplicate-set root.
 * @param index - File index to append.
 * @returns Updated grouped roots.
 */
export function appendIndexToRoot(
  groupedRoots: readonly Readonly<{ indexes: readonly number[]; root: number }>[],
  root: number,
  index: number
): readonly Readonly<{ indexes: readonly number[]; root: number }>[] {
  const existingGroup = findGroupedRoot(groupedRoots, root);
  if (!existingGroup) {
    return [...groupedRoots, { root, indexes: [index] }];
  }

  return updateGroupedRoots(groupedRoots, createGroupedRootAppender(root, index));
}

/**
 * Builds the final dedupe result payload.
 * @param totalFiles - Number of scanned files.
 * @param groups - Duplicate groups.
 * @param strategyExecutions - Successful strategy executions.
 * @returns Dedupe result payload.
 */
export function buildDedupeResult(
  totalFiles: number,
  groups: readonly IDuplicateGroup[],
  strategyExecutions: readonly IStrategyExecution[]
): IDedupeResult {
  return {
    groups,
    totalFiles,
    totalDuplicates: countDuplicateFiles(groups),
    strategiesUsed: createSortedStrategyNames(strategyExecutions)
  };
}

/**
 * Builds one duplicate group from grouped files and match metadata.
 * @param groupFiles - Files in the duplicate group.
 * @param matchMetadata - Match metadata contributing to the group.
 * @returns Duplicate group payload.
 */
export function buildDuplicateGroup(
  groupFiles: readonly IScannedFile[],
  matchMetadata: readonly IStrategyMatch[]
): IDuplicateGroup {
  const firstMatch = getFirstMatch(matchMetadata);
  const strategies = createUniqueStrategies(matchMetadata);
  return {
    key: firstMatch?.key ?? groupFiles[0].originalPath,
    strategy: strategies.join(','),
    strategies,
    files: groupFiles,
    primary: groupFiles[0]
  };
}

/**
 * Builds the outcome for the REPLACE dedupe action.
 * @param result - Dedupe result containing duplicate groups.
 * @returns Replace action outcome.
 */
export function buildReplaceActionOutcome(result: Readonly<IDedupeResult>): IDedupeOutcome {
  return {
    action: DedupeAction.REPLACE,
    skipped: [],
    replaced: getSecondaryFiles(result.groups),
    reported: [],
    errors: []
  };
}

/**
 * Builds the outcome for the REPORT dedupe action.
 * @param result - Dedupe result containing duplicate groups.
 * @returns Report action outcome.
 */
export function buildReportActionOutcome(result: Readonly<IDedupeResult>): IDedupeOutcome {
  return {
    action: DedupeAction.REPORT,
    skipped: [],
    replaced: [],
    reported: result.groups,
    errors: []
  };
}

/**
 * Builds the outcome for the SKIP dedupe action.
 * @param result - Dedupe result containing duplicate groups.
 * @returns Skip action outcome.
 */
export function buildSkipActionOutcome(result: Readonly<IDedupeResult>): IDedupeOutcome {
  return {
    action: DedupeAction.SKIP,
    skipped: getSecondaryFiles(result.groups),
    replaced: [],
    reported: [],
    errors: []
  };
}

/**
 * Builds strategy execution metadata from candidates.
 * @param strategyName - Strategy identifier.
 * @param candidates - Dedupe candidates produced by the strategy.
 * @returns Strategy execution metadata.
 */
export function buildStrategyExecution(
  strategyName: string,
  candidates: readonly IDedupeCandidate[]
): IStrategyExecution {
  return {
    strategy: strategyName,
    keysByPath: createCandidateKeyMap(candidates)
  };
}

/**
 * Compares two strings alphabetically.
 * @param left - First string.
 * @param right - Second string.
 * @returns Locale comparison result.
 */
function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

/**
 * Counts duplicate files across all groups.
 * @param groups - Duplicate groups.
 * @returns Duplicate file count.
 */
function countDuplicateFiles(groups: readonly IDuplicateGroup[]): number {
  let totalDuplicates = 0;

  for (const group of groups) {
    totalDuplicates += group.files.length;
  }

  return totalDuplicates;
}

/**
 * Builds a map of file paths to candidate keys.
 * @param candidates - Dedupe candidates.
 * @returns Candidate key lookup map.
 */
function createCandidateKeyMap(
  candidates: readonly IDedupeCandidate[]
): ReadonlyMap<string, string> {
  return new Map(candidates.map(toCandidatePathKeyEntry));
}

/**
 * Creates a grouped-root updater that appends one index to a matching root.
 * @param root - Duplicate-set root to update.
 * @param index - File index to append.
 * @returns Group update function.
 */
function createGroupedRootAppender(
  root: number,
  index: number
): (
  group: Readonly<{ indexes: readonly number[]; root: number }>
) => Readonly<{ indexes: readonly number[]; root: number }> {
  /**
   * Updates one grouped-root entry when it matches the target root.
   * @param group - Grouped-root entry.
   * @returns Updated grouped-root entry.
   */
  function appendGroupedRootIndex(
    group: Readonly<{ indexes: readonly number[]; root: number }>
  ): Readonly<{ indexes: readonly number[]; root: number }> {
    return group.root === root ? { ...group, indexes: [...group.indexes, index] } : group;
  }

  return appendGroupedRootIndex;
}

/**
 * Creates the index pairs inside one duplicate group.
 * @param indexes - File indexes in the group.
 * @returns Group-local index pairs.
 */
export function createGroupIndexPairs(indexes: readonly number[]): readonly IIndexPair[] {
  let pairs: readonly IIndexPair[] = [];

  for (let leftIndex = 0; leftIndex < indexes.length - DUPLICATE_OFFSET; leftIndex++) {
    for (let rightIndex = leftIndex + DUPLICATE_OFFSET; rightIndex < indexes.length; rightIndex++) {
      pairs = [...pairs, { leftIndex: indexes[leftIndex], rightIndex: indexes[rightIndex] }];
    }
  }

  return pairs;
}

/**
 * Creates a file selector for indexed file lookups.
 * @param files - All scanned files.
 * @returns Indexed file selector.
 */
function createIndexedFileSelector(
  files: readonly IScannedFile[]
): (index: number) => IScannedFile {
  /**
   * Selects one scanned file by index.
   * @param index - File index.
   * @returns Matching scanned file.
   */
  function selectIndexedFile(index: number): IScannedFile {
    return files[index];
  }

  return selectIndexedFile;
}

/**
 * Builds all unique index pairs for a file count.
 * @param fileCount - Number of files.
 * @returns Unique index pairs.
 */
export function createIndexPairs(fileCount: number): readonly IIndexPair[] {
  let pairs: readonly IIndexPair[] = [];

  for (let leftIndex = 0; leftIndex < fileCount - DUPLICATE_OFFSET; leftIndex++) {
    for (let rightIndex = leftIndex + DUPLICATE_OFFSET; rightIndex < fileCount; rightIndex++) {
      pairs = [...pairs, { leftIndex, rightIndex }];
    }
  }

  return pairs;
}

/**
 * Creates the initial disjoint-set parent pointers.
 * @param fileCount - Number of files.
 * @returns Initial parent pointers.
 */
export function createInitialParents(fileCount: number): readonly number[] {
  let parents: readonly number[] = [];

  for (let index = 0; index < fileCount; index++) {
    parents = [...parents, index];
  }

  return parents;
}

/**
 * Creates a stable pair id from two indexes.
 * @param leftIndex - First index.
 * @param rightIndex - Second index.
 * @returns Stable pair identifier.
 */
export function createPairId(leftIndex: number, rightIndex: number): string {
  return `${Math.min(leftIndex, rightIndex)}:${Math.max(leftIndex, rightIndex)}`;
}

/**
 * Creates a map of pair ids to matching strategies.
 * @param pairEvaluations - Duplicate pair evaluations.
 * @returns Pair-match lookup map.
 */
export function createPairMatchMap(
  pairEvaluations: readonly Readonly<{
    leftIndex: number;
    matched: readonly IStrategyMatch[];
    rightIndex: number;
  }>[]
): ReadonlyMap<string, readonly IStrategyMatch[]> {
  return new Map(pairEvaluations.map(toPairMatchEntry));
}

/**
 * Creates a parent-pointer replacement function.
 * @param targetIndex - Parent index to replace.
 * @param nextParent - Replacement parent value.
 * @returns Parent replacement function.
 */
function createParentReplacer(
  targetIndex: number,
  nextParent: number
): (parent: number, index: number) => number {
  /**
   * Replaces one parent value when the index matches the target.
   * @param parent - Current parent value.
   * @param index - Current parent index.
   * @returns Updated parent value.
   */
  function replaceParentAtIndex(parent: number, index: number): number {
    return index === targetIndex ? nextParent : parent;
  }

  return replaceParentAtIndex;
}

/**
 * Creates unique strategy names in sorted order.
 * @param strategyExecutions - Successful strategy executions.
 * @returns Sorted strategy names.
 */
function createSortedStrategyNames(
  strategyExecutions: readonly IStrategyExecution[]
): readonly string[] {
  let sortedNames: readonly string[] = [];

  for (const execution of strategyExecutions) {
    sortedNames = insertSortedString(sortedNames, toStrategyName(execution));
  }

  return sortedNames;
}

/**
 * Creates a support predicate for one dedupe strategy.
 * @param strategy - Strategy to evaluate.
 * @returns Supported-file predicate.
 */
function createSupportedFilePredicate(
  strategy: Readonly<IDedupeStrategy>
): (file: Readonly<IScannedFile>) => boolean {
  /**
   * Returns whether one file is supported by the strategy.
   * @param file - Scanned file.
   * @returns True when the strategy can process the file.
   */
  function isSupportedFile(file: Readonly<IScannedFile>): boolean {
    return strategy.canProcess(file);
  }

  return isSupportedFile;
}

/**
 * Creates unique strategies from match metadata.
 * @param matchMetadata - Match metadata contributing to a group.
 * @returns Unique strategy names.
 */
function createUniqueStrategies(matchMetadata: readonly IStrategyMatch[]): readonly string[] {
  let strategies: readonly string[] = [];

  for (const match of matchMetadata) {
    if (!strategies.includes(match.strategy)) {
      strategies = [...strategies, match.strategy];
    }
  }

  return strategies;
}

/**
 * Returns the grouped-root entry matching the provided root.
 * @param groupedRoots - Existing grouped roots.
 * @param root - Duplicate-set root.
 * @returns Matching grouped-root entry or undefined.
 */
function findGroupedRoot(
  groupedRoots: readonly Readonly<{ indexes: readonly number[]; root: number }>[],
  root: number
): Readonly<{ indexes: readonly number[]; root: number }> | undefined {
  for (const group of groupedRoots) {
    if (group.root === root) {
      return group;
    }
  }

  return undefined;
}

/**
 * Returns the first match in a metadata list, when present.
 * @param matchMetadata - Match metadata list.
 * @returns First match or undefined.
 */
function getFirstMatch(
  matchMetadata: readonly IStrategyMatch[]
): Readonly<IStrategyMatch> | undefined {
  return matchMetadata[0];
}

/**
 * Returns the files referenced by the provided indexes.
 * @param files - All scanned files.
 * @param indexes - Indexes to select.
 * @returns Files referenced by the indexes.
 */
export function getGroupFiles(
  files: readonly IScannedFile[],
  indexes: readonly number[]
): readonly IScannedFile[] {
  return indexes.map(createIndexedFileSelector(files));
}

/**
 * Returns all files except the primary file in each duplicate group.
 * @param groups - Duplicate groups.
 * @returns Secondary duplicate files.
 */
export function getSecondaryFiles(groups: readonly IDuplicateGroup[]): readonly IScannedFile[] {
  return groups.flatMap(toSecondaryFiles);
}

/**
 * Returns successful candidates, discarding nulls.
 * @param candidates - Candidate results.
 * @returns Non-null candidates.
 */
export function getSuccessfulCandidates(
  candidates: readonly (IDedupeCandidate | null)[]
): IDedupeCandidate[] {
  return candidates.filter(isDedupeCandidate);
}

/**
 * Returns successful strategy executions, discarding empty ones.
 * @param executions - Strategy execution results.
 * @returns Non-null strategy executions.
 */
export function getSuccessfulExecutions(
  executions: readonly (IStrategyExecution | null)[]
): readonly IStrategyExecution[] {
  return executions.filter(isStrategyExecution);
}

/**
 * Returns files supported by a dedupe strategy.
 * @param strategy - Strategy to evaluate.
 * @param files - Files to filter.
 * @returns Supported files.
 */
export function getSupportedFiles(
  strategy: Readonly<IDedupeStrategy>,
  files: readonly IScannedFile[]
): readonly IScannedFile[] {
  return files.filter(createSupportedFilePredicate(strategy));
}

/**
 * Inserts one string into an alphabetically sorted list.
 * @param sortedNames - Existing sorted strings.
 * @param name - String to insert.
 * @returns Updated sorted strings.
 */
function insertSortedString(sortedNames: readonly string[], name: string): readonly string[] {
  let inserted = false;
  let nextNames: readonly string[] = [];

  for (const currentName of sortedNames) {
    if (!inserted && compareStrings(name, currentName) < 0) {
      nextNames = [...nextNames, name];
      inserted = true;
    }

    nextNames = [...nextNames, currentName];
  }

  return inserted ? nextNames : [...nextNames, name];
}

/**
 * Returns whether a candidate result is non-null.
 * @param candidate - Candidate result.
 * @returns True when the candidate is present.
 */
function isDedupeCandidate(candidate: IDedupeCandidate | null): candidate is IDedupeCandidate {
  return candidate !== null;
}

/**
 * Returns whether a strategy execution result is non-null.
 * @param execution - Strategy execution result.
 * @returns True when the execution is present.
 */
function isStrategyExecution(
  execution: IStrategyExecution | null
): execution is IStrategyExecution {
  return execution !== null;
}

/**
 * Replaces one parent pointer with a new root.
 * @param parents - Existing parent pointers.
 * @param targetIndex - Index to update.
 * @param nextParent - New parent pointer value.
 * @returns Updated parent pointers.
 */
export function replaceParent(
  parents: readonly number[],
  targetIndex: number,
  nextParent: number
): readonly number[] {
  return parents.map(createParentReplacer(targetIndex, nextParent));
}

/**
 * Converts a candidate into a path-key map entry.
 * @param candidate - Dedupe candidate.
 * @returns Path-key entry.
 */
function toCandidatePathKeyEntry(candidate: Readonly<IDedupeCandidate>): readonly [string, string] {
  return [candidate.file.originalPath, candidate.key];
}

/**
 * Converts a duplicate-pair evaluation into a pair-match map entry.
 * @param evaluation - Duplicate-pair evaluation.
 * @returns Pair-match entry.
 */
function toPairMatchEntry(
  evaluation: Readonly<{
    leftIndex: number;
    matched: readonly IStrategyMatch[];
    rightIndex: number;
  }>
): readonly [string, readonly IStrategyMatch[]] {
  return [createPairId(evaluation.leftIndex, evaluation.rightIndex), evaluation.matched];
}

/**
 * Returns all non-primary files in one duplicate group.
 * @param group - Duplicate group.
 * @returns Secondary duplicate files for the group.
 */
function toSecondaryFiles(group: Readonly<IDuplicateGroup>): readonly IScannedFile[] {
  return group.files.slice(DUPLICATE_OFFSET);
}

/**
 * Returns the strategy name from a strategy execution.
 * @param execution - Strategy execution metadata.
 * @returns Strategy name.
 */
function toStrategyName(execution: Readonly<IStrategyExecution>): string {
  return execution.strategy;
}

/**
 * Applies an immutable update across grouped-root entries.
 * @param groupedRoots - Existing grouped roots.
 * @param updateGroup - Group update function.
 * @returns Updated grouped roots.
 */
function updateGroupedRoots(
  groupedRoots: readonly Readonly<{ indexes: readonly number[]; root: number }>[],
  updateGroup: (
    group: Readonly<{ indexes: readonly number[]; root: number }>
  ) => Readonly<{ indexes: readonly number[]; root: number }>
): readonly Readonly<{ indexes: readonly number[]; root: number }>[] {
  return groupedRoots.map(updateGroup);
}
