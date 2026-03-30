import * as crypto from 'node:crypto';
import * as path from 'node:path';

import { type OrderlyConfig, CollisionResolutionStrategy } from '../config/types';
import { Logger } from '../logger/logger';
import { Clock } from '../utils/clock';
import { FileSystemUtils } from '../utils/file-system-utils';

import type { ICollisionResolver } from './interfaces';
import type { IFileOperation } from './types';

const DEFAULT_COLLISION_STRATEGY = CollisionResolutionStrategy.KEEP_BOTH;
const DEFAULT_RENAME_PATTERN = '{name}-{n}{ext}';
const DEFAULT_MAX_ATTEMPTS = 100;
const RANDOM_SUFFIX_LENGTH = 6;
const NAME_PLACEHOLDER = '{name}';
const NUMBER_PLACEHOLDER = '{n}';
const EXT_PLACEHOLDER = '{ext}';

export interface ICollisionResolutionResult {
  readonly collisionResolved: boolean;
  readonly finalPath: string;
  readonly skipReason?: string;
  readonly succeeded: boolean;
}

interface ITargetPathParts {
  readonly dir: string;
  readonly ext: string;
  readonly nameWithoutExt: string;
}

/**
 * Resolves destination-path collisions before file operations execute.
 */
export class CollisionResolver implements ICollisionResolver {
  /**
   * Creates a new CollisionResolver instance.
   * @param logger - Logger instance for collision warnings.
   * @param config - Optional config containing collision policy.
   */
  constructor(
    private readonly logger: Readonly<Logger>,
    private readonly config?: Readonly<OrderlyConfig>
  ) {}

  /**
   * Resolves collision handling for one file operation.
   * @param operation - File operation being prepared.
   * @returns Resolution result containing a final path or skip outcome.
   */
  resolve(operation: Readonly<IFileOperation>): Readonly<ICollisionResolutionResult> {
    if (!this.hasCollision(operation)) {
      return { succeeded: true, finalPath: operation.newPath, collisionResolved: false };
    }

    const resolvedPath = this.resolveCollision(operation, operation.newPath);
    return resolvedPath
      ? { succeeded: true, finalPath: resolvedPath, collisionResolved: true }
      : this.buildSkippedCollisionResult(operation);
  }

  /**
   * Creates the skipped collision result payload.
   * @param operation - Operation being skipped.
   * @returns Skipped collision result.
   */
  private buildSkippedCollisionResult(
    operation: Readonly<IFileOperation>
  ): Readonly<ICollisionResolutionResult> {
    return {
      succeeded: false,
      finalPath: operation.newPath,
      collisionResolved: false,
      skipReason: `Skipping ${operation.originalPath} due to collision resolution strategy`
    };
  }

  /**
   * Builds the final fallback collision filename.
   * @param targetParts - Parsed path parts for the colliding file.
   * @returns Fallback path with monotonic token and random suffix.
   */
  private buildFallbackSuggestedPath(targetParts: Readonly<ITargetPathParts>): string {
    return path.join(
      targetParts.dir,
      `${targetParts.nameWithoutExt}-${Clock.nowMonotonicToken()}-${this.createRandomSuffix()}${targetParts.ext}`
    );
  }

  /**
   * Builds a numbered collision filename.
   * @param renamePattern - Pattern used for numbering collisions.
   * @param nameWithoutExt - Base filename without extension.
   * @param ext - Original extension.
   * @param attempt - Attempt index.
   * @returns Suggested filename.
   */
  private buildSuggestedName(
    renamePattern: string,
    nameWithoutExt: string,
    ext: string,
    attempt: number
  ): string {
    return renamePattern
      .replace(NAME_PLACEHOLDER, nameWithoutExt)
      .replace(NUMBER_PLACEHOLDER, String(attempt))
      .replace(EXT_PLACEHOLDER, ext);
  }

  /**
   * Creates a random suffix for collision fallback names.
   * @returns Hex-like random suffix.
   */
  private createRandomSuffix(): string {
    return crypto.randomUUID().replaceAll('-', '').slice(0, RANDOM_SUFFIX_LENGTH);
  }

  /**
   * Searches for the first available keep-both filename.
   * @param options - Collision naming options.
   * @returns Available path when found; otherwise null.
   */
  private findAvailableSuggestedPath(
    options: Readonly<{
      dir: string;
      ext: string;
      maxAttempts: number;
      nameWithoutExt: string;
      renamePattern: string;
    }>
  ): string | null {
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      const suggestedPath = path.join(
        options.dir,
        this.buildSuggestedName(options.renamePattern, options.nameWithoutExt, options.ext, attempt)
      );
      if (!FileSystemUtils.hasPath(suggestedPath)) {
        return suggestedPath;
      }
    }

    return null;
  }

  /**
   * Generates a suggested alternative filename to resolve collision.
   * @param targetPath - The original target path that has a collision.
   * @returns A suggested alternative filename that doesn't conflict with existing files.
   */
  private generateSuggestedName(targetPath: string): string {
    const targetParts = this.getTargetPathParts(targetPath);
    const availablePath = this.findAvailableSuggestedPath({
      dir: targetParts.dir,
      nameWithoutExt: targetParts.nameWithoutExt,
      ext: targetParts.ext,
      renamePattern: this.config?.collisionResolution?.renamePattern || DEFAULT_RENAME_PATTERN,
      maxAttempts: this.config?.collisionResolution?.maxAttempts || DEFAULT_MAX_ATTEMPTS
    });
    return availablePath ?? this.buildFallbackSuggestedPath(targetParts);
  }

  /**
   * Splits a target path into reusable naming parts.
   * @param targetPath - Path being resolved.
   * @returns Parsed path parts.
   */
  private getTargetPathParts(targetPath: string): Readonly<ITargetPathParts> {
    const filename = path.basename(targetPath);
    const ext = path.extname(filename);
    return { dir: path.dirname(targetPath), ext, nameWithoutExt: path.basename(filename, ext) };
  }

  /**
   * Handles replacement collision strategy.
   * @param operation - Colliding file operation.
   * @param targetPath - Existing destination path.
   * @returns Target path or a generated fallback path.
   */
  private handleReplaceCollision(operation: Readonly<IFileOperation>, targetPath: string): string {
    this.logger.warn('REPLACE strategy: deleting existing file to allow replacement', {
      target: targetPath,
      source: operation.originalPath
    });

    if (!FileSystemUtils.hasPath(targetPath)) {
      return targetPath;
    }

    return this.tryDeleteCollisionTarget(targetPath);
  }

  /**
   * Handles invalid collision strategies defensively.
   * @param operation - Colliding file operation.
   * @param targetPath - Existing destination path.
   * @param strategy - Unrecognized configured strategy.
   * @returns A generated safe target path.
   */
  private handleUnknownCollisionStrategy(
    operation: Readonly<IFileOperation>,
    targetPath: string,
    strategy: unknown
  ): string {
    this.logger.warn(
      `Unknown collision resolution strategy '${String(strategy)}', falling back to '${DEFAULT_COLLISION_STRATEGY}'`,
      {
        operation: operation.originalPath,
        target: targetPath,
        providedStrategy: strategy,
        validStrategies: Object.values(CollisionResolutionStrategy)
      }
    );
    return this.generateSuggestedName(targetPath);
  }

  /**
   * Checks whether the target path collides with an existing file.
   * @param operation - Operation being evaluated.
   * @returns True when the destination already exists and differs from source.
   */
  private hasCollision(operation: Readonly<IFileOperation>): boolean {
    return (
      FileSystemUtils.hasPath(operation.newPath) && operation.newPath !== operation.originalPath
    );
  }

  /**
   * Resolves a file collision based on the configured strategy.
   * @param operation - The file operation that encountered a collision.
   * @param targetPath - The target path where the collision occurred.
   * @returns The resolved target path, or null to skip the operation.
   */
  private resolveCollision(operation: Readonly<IFileOperation>, targetPath: string): string | null {
    const strategy = this.config?.collisionResolution?.strategy || DEFAULT_COLLISION_STRATEGY;
    if (strategy === CollisionResolutionStrategy.SKIP) return null;
    if (strategy === CollisionResolutionStrategy.KEEP_BOTH) {
      return this.generateSuggestedName(targetPath);
    }
    return strategy === CollisionResolutionStrategy.REPLACE
      ? this.handleReplaceCollision(operation, targetPath)
      : this.handleUnknownCollisionStrategy(operation, targetPath, strategy);
  }

  /**
   * Deletes the existing collision target or falls back to keep-both.
   * @param targetPath - Existing destination path.
   * @returns A safe target path for the operation.
   */
  private tryDeleteCollisionTarget(targetPath: string): string {
    try {
      FileSystemUtils.unlinkSync(targetPath);
      return targetPath;
    } catch (unlinkError) {
      this.logger.warn(
        'REPLACE strategy: failed to delete existing file, falling back to keep-both',
        {
          target: targetPath,
          error: unlinkError instanceof Error ? unlinkError.message : String(unlinkError)
        }
      );
      return this.generateSuggestedName(targetPath);
    }
  }
}
