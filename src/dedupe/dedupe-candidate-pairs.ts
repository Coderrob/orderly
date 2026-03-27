import type { IStrategyExecution } from './dedupe-service.helpers';

interface IPathPair {
  readonly leftPath: string;
  readonly rightPath: string;
}

const MIN_DUPLICATE_GROUP_SIZE = 2;

export type { IPathPair };

/**
 * Creates unique candidate file-path pairs from strategy key buckets.
 * @param strategyExecutions - Strategy outputs keyed by file path.
 * @returns Unique candidate file-path pairs.
 */
export function createCandidatePairs(
  strategyExecutions: readonly IStrategyExecution[]
): readonly Readonly<IPathPair>[] {
  const candidatePairs = new Map<string, Readonly<IPathPair>>();

  for (const execution of strategyExecutions) {
    for (const bucketPaths of createStrategyBuckets(execution).values()) {
      if (!isDuplicateCandidateBucket(bucketPaths)) {
        continue;
      }

      for (const pair of toBucketPairs(bucketPaths)) {
        candidatePairs.set(createPathPairId(pair.leftPath, pair.rightPath), pair);
      }
    }
  }

  return [...candidatePairs.values()];
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
  const buckets = new Map<string, readonly string[]>();

  for (const [filePath, key] of strategyExecution.keysByPath.entries()) {
    buckets.set(key, [...(buckets.get(key) ?? []), filePath]);
  }

  return buckets;
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
