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
 * Creates a selector that maps pair indexes to stable path pairs within one bucket.
 * @param bucketPaths - File paths sharing one strategy key.
 * @returns Pair selector.
 */
function createBucketPairSelector(
  bucketPaths: readonly string[]
): (_: unknown, pairIndex: number) => Readonly<IPathPair> {
  /**
   * Selects one bucket pair by flattened pair index.
   * @param _value - Unused array-like source value.
   * @param pairIndex - Flattened pair index.
   * @returns Stable path pair for the requested flattened index.
   */
  function selectBucketPair(_value: unknown, pairIndex: number): Readonly<IPathPair> {
    return toBucketPair(bucketPaths, pairIndex);
  }

  return selectBucketPair;
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
  return strategyExecutions.flatMap(toExecutionDuplicateCandidateBuckets);
}

/**
 * Creates a selector that maps bucket entries to duplicate candidate buckets.
 * @param strategy - Strategy identifier.
 * @returns Duplicate candidate bucket selector.
 */
function createDuplicateCandidateBucketSelector(
  strategy: string
): (
  bucketEntry: Readonly<readonly [string, readonly string[]]>
) => Readonly<IDuplicateCandidateBucket> | null {
  /**
   * Selects a duplicate candidate bucket from one strategy bucket entry.
   * @param bucketEntry - Bucket entry keyed by duplicate key.
   * @returns Duplicate candidate bucket or null when too small.
   */
  function selectDuplicateCandidateBucket(
    bucketEntry: Readonly<readonly [string, readonly string[]]>
  ): Readonly<IDuplicateCandidateBucket> | null {
    return toDuplicateCandidateBucket(strategy, bucketEntry);
  }

  return selectDuplicateCandidateBucket;
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
    const bucketPaths = bucketSets.get(key) ?? new Set<string>();
    bucketPaths.add(filePath);
    if (!bucketSets.has(key)) {
      bucketSets.set(key, bucketPaths);
    }
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
 * Returns whether an optional duplicate candidate bucket is present.
 * @param bucket - Optional duplicate candidate bucket.
 * @returns True when the bucket is present.
 */
function isPresentDuplicateCandidateBucket(
  bucket: Readonly<IDuplicateCandidateBucket> | null
): bucket is Readonly<IDuplicateCandidateBucket> {
  return bucket !== null;
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
 * Converts a flattened pair index into one stable bucket path pair.
 * @param bucketPaths - File paths sharing one strategy key.
 * @param pairIndex - Flattened pair index.
 * @returns Stable path pair for the requested flattened index.
 */
function toBucketPair(bucketPaths: readonly string[], pairIndex: number): Readonly<IPathPair> {
  let remainingPairIndex = pairIndex;

  for (let leftIndex = 0; leftIndex < bucketPaths.length - 1; leftIndex++) {
    const pairCount = bucketPaths.length - leftIndex - 1;
    if (remainingPairIndex < pairCount) {
      return createPathPair(
        bucketPaths[leftIndex],
        bucketPaths[leftIndex + remainingPairIndex + 1]
      );
    }

    remainingPairIndex -= pairCount;
  }

  return createPathPair(bucketPaths[0], bucketPaths[0]);
}

/**
 * Converts one duplicate-candidate bucket into file-path pairs.
 * @param bucketPaths - File paths sharing one strategy key.
 * @returns Unique file-path pairs within the bucket.
 */
function toBucketPairs(bucketPaths: readonly string[]): readonly Readonly<IPathPair>[] {
  const pairCount = (bucketPaths.length * (bucketPaths.length - 1)) / MIN_DUPLICATE_GROUP_SIZE;
  return Array.from({ length: pairCount }, createBucketPairSelector(bucketPaths));
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

/**
 * Converts one strategy execution into duplicate candidate buckets.
 * @param strategyExecution - Strategy execution keyed by original file path.
 * @returns Duplicate candidate buckets from the execution.
 */
function toExecutionDuplicateCandidateBuckets(
  strategyExecution: Readonly<IStrategyExecution>
): readonly Readonly<IDuplicateCandidateBucket>[] {
  return [...createStrategyBuckets(strategyExecution).entries()]
    .map(createDuplicateCandidateBucketSelector(strategyExecution.strategy))
    .filter(isPresentDuplicateCandidateBucket);
}
