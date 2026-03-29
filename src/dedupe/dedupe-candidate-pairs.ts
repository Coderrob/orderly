import type { IStrategyExecution } from './dedupe-analysis.helpers';

interface IPathPair {
  readonly leftPath: string;
  readonly rightPath: string;
}

interface IDuplicateCandidateBucket {
  readonly key: string;
  readonly paths: readonly string[];
  readonly strategy: string;
}

const MIN_DUPLICATE_GROUP_SIZE = 2;

export type { IDuplicateCandidateBucket, IPathPair };

/**
 * Adds one file path to a bucket set.
 * @param bucketPaths - Existing bucket paths.
 * @param filePath - File path to add.
 * @returns Updated bucket-path set.
 */
function addBucketPath(
  bucketPaths: Readonly<Set<string>> | undefined,
  filePath: string
): Set<string> {
  return new Set([...(bucketPaths ?? []), filePath]);
}

/**
 * Creates unique candidate file-path pairs from strategy key buckets.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Unique candidate file-path pairs.
 */
export function createCandidatePairs(
  strategyExecutions: readonly IStrategyExecution[]
): readonly Readonly<IPathPair>[] {
  const candidatePairs = new Map<string, Readonly<IPathPair>>();

  for (const bucket of createDuplicateCandidateBuckets(strategyExecutions)) {
    for (const pair of toBucketPairs(bucket.paths)) {
      candidatePairs.set(createPathPairId(pair.leftPath, pair.rightPath), pair);
    }
  }

  return [...candidatePairs.values()];
}

/**
 * Creates duplicate candidate buckets across all strategy executions.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Duplicate candidate buckets with at least two file paths.
 */
export function createDuplicateCandidateBuckets(
  strategyExecutions: readonly IStrategyExecution[]
): readonly Readonly<IDuplicateCandidateBucket>[] {
  let buckets: readonly Readonly<IDuplicateCandidateBucket>[] = [];

  for (const execution of strategyExecutions) {
    for (const bucketEntry of createStrategyBuckets(execution).entries()) {
      const bucket = toDuplicateCandidateBucket(execution.strategy, bucketEntry);
      if (bucket) {
        buckets = [...buckets, bucket];
      }
    }
  }

  return buckets;
}

/**
 * Creates a stable path pair with alphabetically ordered paths.
 * @param leftPath - First file path.
 * @param rightPath - Second file path.
 * @returns Stable path-pair value.
 */
function createPathPair(leftPath: string, rightPath: string): Readonly<IPathPair> {
  return leftPath < rightPath
    ? { leftPath, rightPath }
    : { leftPath: rightPath, rightPath: leftPath };
}

/**
 * Creates a stable candidate-pair id from two file paths.
 * @param leftPath - First file path.
 * @param rightPath - Second file path.
 * @returns Stable candidate-pair identifier.
 */
function createPathPairId(leftPath: string, rightPath: string): string {
  return leftPath < rightPath ? `${leftPath}::${rightPath}` : `${rightPath}::${leftPath}`;
}

/**
 * Creates strategy buckets keyed by dedupe key for one strategy execution.
 * @param strategyExecution - Strategy execution keyed by original file path.
 * @returns Strategy buckets of file paths sharing the same key.
 */
function createStrategyBuckets(
  strategyExecution: Readonly<IStrategyExecution>
): ReadonlyMap<string, readonly string[]> {
  const bucketSets = new Map<string, Set<string>>();

  for (const [filePath, key] of strategyExecution.keysByPath.entries()) {
    bucketSets.set(key, addBucketPath(bucketSets.get(key), filePath));
  }

  return new Map([...bucketSets.entries()].map(toBucketEntry));
}

/**
 * Returns whether a strategy key bucket contains duplicate candidates.
 * @param paths - File paths sharing one strategy key.
 * @returns True when the bucket contains at least two file paths.
 */
function isDuplicateCandidateBucket(paths: readonly string[]): boolean {
  return paths.length >= MIN_DUPLICATE_GROUP_SIZE;
}

/**
 * Converts one bucket-set entry into a bucket-array entry.
 * @param entry - Bucket-set entry.
 * @returns Bucket-array entry.
 */
function toBucketEntry(
  entry: readonly [string, Readonly<Set<string>>]
): readonly [string, readonly string[]] {
  return [entry[0], [...entry[1]]];
}

/**
 * Converts one duplicate-candidate bucket into file-path pairs.
 * @param bucketPaths - File paths sharing one strategy key.
 * @returns Unique file-path pairs within the bucket.
 */
function toBucketPairs(bucketPaths: readonly string[]): readonly Readonly<IPathPair>[] {
  let pairs: readonly Readonly<IPathPair>[] = [];

  for (let leftIndex = 0; leftIndex < bucketPaths.length - 1; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < bucketPaths.length; rightIndex++) {
      pairs = [...pairs, createPathPair(bucketPaths[leftIndex], bucketPaths[rightIndex])];
    }
  }

  return pairs;
}

/**
 * Converts one strategy bucket entry into a duplicate candidate bucket when large enough.
 * @param strategy - Strategy identifier.
 * @param bucketEntry - Bucket entry keyed by duplicate key.
 * @returns Duplicate candidate bucket or null when too small.
 */
function toDuplicateCandidateBucket(
  strategy: string,
  bucketEntry: Readonly<readonly [string, readonly string[]]>
): Readonly<IDuplicateCandidateBucket> | null {
  return isDuplicateCandidateBucket(bucketEntry[1])
    ? { strategy, key: bucketEntry[0], paths: bucketEntry[1] }
    : null;
}
