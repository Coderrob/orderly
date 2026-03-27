import type { IScannedFile } from '../scanner/interfaces';

import type { IStrategyMatch } from './dedupe-service.helpers';
import type { IDuplicateGroup } from './types';

interface IDuplicatePairEvaluation {
  readonly leftIndex: number;
  readonly matched: readonly IStrategyMatch[];
  readonly rightIndex: number;
}

export type { IDuplicatePairEvaluation };

/**
 * Returns whether an optional duplicate-group value is present.
 * @param group - Optional duplicate group value.
 * @returns True when the group is non-null.
 */
export function isDuplicateGroup(group: IDuplicateGroup | null): group is IDuplicateGroup {
  return group !== null;
}

/**
 * Returns whether an optional duplicate-pair evaluation is present.
 * @param pairEvaluation - Optional duplicate-pair evaluation.
 * @returns True when the evaluation is non-null.
 */
export function isDuplicatePairEvaluation(
  pairEvaluation: IDuplicatePairEvaluation | null
): pairEvaluation is IDuplicatePairEvaluation {
  return pairEvaluation !== null;
}

/**
 * Converts one scanned file into a file-index lookup entry.
 * @param file - Scanned file.
 * @param index - File index.
 * @returns File-index lookup entry.
 */
export function toFileIndexEntry(
  file: Readonly<IScannedFile>,
  index: number
): readonly [string, number] {
  return [file.originalPath, index];
}
