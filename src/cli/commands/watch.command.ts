import { COMMAND_MESSAGES, ExitCode } from '../constants';
import type {
  ICommandResult,
  IOrganizeHandler,
  IWatchCommandOptions,
  IWatchHandler
} from '../interfaces';

import {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers';
import {
  createDirectoryOptionsCommandExecutionRef,
  createWrappedCommand
} from './command-wrapper.helpers';
import { startScheduledCycles, type IRunCyclesOptions } from './watch.command.scheduler';

const DEFAULT_INTERVAL_SECONDS = 5;
const MINIMUM_INTERVAL_SECONDS = 1;
const CONTINUOUS_CYCLE_COUNT = 0;

interface IWatchExecuteDependencies {
  executeCore(directory: string, options: Readonly<IWatchCommandOptions>): Promise<ICommandResult>;
}

enum WatchOptionKey {
  AUTO_CONFIG = 'autoConfig',
  CLEAN_EMPTY_DIRS = 'cleanEmptyDirs',
  CONFIG = 'config',
  CONFIRM_REPLACE = 'confirmReplace',
  CYCLES = 'cycles',
  DEDUPE = 'dedupe',
  DEDUPE_ACTION = 'dedupeAction',
  DRY_RUN = 'dryRun',
  INTERVAL = 'interval',
  LOG_LEVEL = 'logLevel',
  MANIFEST = 'manifest',
  OUTPUT = 'output',
  QUARANTINE_DIR = 'quarantineDir'
}

/**
 * Handler for continuous polling-based watch mode.
 */
export class WatchHandler implements IWatchHandler {
  public readonly execute: (
    directory: string,
    options: Readonly<IWatchCommandOptions>
  ) => Promise<ICommandResult>;

  /**
   * Creates a new watch command handler.
   * @param organizeHandler - Organize handler used for each cycle.
   */
  constructor(private readonly organizeHandler: Readonly<IOrganizeHandler>) {
    this.execute = createWatchExecute({
      executeCore: this.executeCore.bind(this)
    });
  }

  /**
   * Executes watch mode.
   * @param directory - Target directory.
   * @param options - Watch options.
   * @returns Command result.
   */
  private async executeCore(
    directory: string,
    options: Readonly<IWatchCommandOptions>
  ): Promise<ICommandResult> {
    const completedCycles = await this.runCycles({
      completedCycles: 0,
      cycleLimit: this.resolveCycleLimit(options.cycles),
      directory,
      executeCycle: this.organizeHandler.execute.bind(this.organizeHandler),
      hasReachedCycleLimit: this.hasReachedCycleLimit.bind(this),
      intervalSeconds: this.resolveIntervalSeconds(options.interval),
      options,
      signal: options.signal
    });

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.WATCH_SUCCESS.replace('{0}', String(completedCycles))
    };
  }

  /**
   * Returns whether the requested cycle limit has been reached.
   * @param completedCycles - Completed cycle count.
   * @param cycleLimit - Requested cycle limit.
   * @returns True when execution should stop.
   */
  private hasReachedCycleLimit(completedCycles: number, cycleLimit: number): boolean {
    return cycleLimit !== CONTINUOUS_CYCLE_COUNT && completedCycles >= cycleLimit;
  }

  /**
   * Resolves polling interval.
   * @param interval - Raw interval input.
   * @returns Interval in seconds.
   */
  private resolveIntervalSeconds(interval?: string): number {
    const parsed = Number(interval ?? DEFAULT_INTERVAL_SECONDS);
    return Number.isFinite(parsed) && parsed >= MINIMUM_INTERVAL_SECONDS
      ? parsed
      : DEFAULT_INTERVAL_SECONDS;
  }

  /**
   * Resolves cycle limit.
   * @param cycles - Raw cycle input.
   * @returns Parsed cycle count.
   */
  private resolveCycleLimit(cycles?: string): number {
    const parsed = Number(cycles ?? CONTINUOUS_CYCLE_COUNT);
    return Number.isFinite(parsed) && parsed >= CONTINUOUS_CYCLE_COUNT
      ? parsed
      : CONTINUOUS_CYCLE_COUNT;
  }

  /**
   * Runs watch cycles until the requested limit is reached.
   * @param runOptions - Watch cycle execution options.
   * @returns Completed cycle count.
   */
  private async runCycles(runOptions: Readonly<IRunCyclesOptions>): Promise<number> {
    return new Promise<number>(startScheduledCycles.bind(null, runOptions));
  }
}

/**
 * Creates normalized watch boolean options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized boolean options.
 */
function createWatchBooleanOptions(value: object): Readonly<IWatchCommandOptions> {
  const autoConfig = getOptionalBooleanOption(value, WatchOptionKey.AUTO_CONFIG);
  const cleanEmptyDirs = getOptionalBooleanOption(value, WatchOptionKey.CLEAN_EMPTY_DIRS);
  const confirmReplace = getOptionalBooleanOption(value, WatchOptionKey.CONFIRM_REPLACE);
  const dedupe = getOptionalBooleanOption(value, WatchOptionKey.DEDUPE);
  const dryRun = getOptionalBooleanOption(value, WatchOptionKey.DRY_RUN);
  const manifest = getOptionalBooleanOption(value, WatchOptionKey.MANIFEST);
  return {
    ...(autoConfig === undefined ? {} : { autoConfig }),
    ...(cleanEmptyDirs === undefined ? {} : { cleanEmptyDirs }),
    ...(confirmReplace === undefined ? {} : { confirmReplace }),
    ...(dedupe === undefined ? {} : { dedupe }),
    ...(dryRun === undefined ? {} : { dryRun }),
    ...(manifest === undefined ? {} : { manifest })
  };
}

/**
 * Creates the wrapped execute function for the watch handler.
 * @param handler - Watch handler dependencies.
 * @returns Wrapped execute function.
 */
function createWatchExecute(
  handler: Readonly<IWatchExecuteDependencies>
): (directory: string, options: Readonly<IWatchCommandOptions>) => Promise<ICommandResult> {
  return createWrappedCommand<[string, Readonly<IWatchCommandOptions>]>({
    commandName: 'watch',
    errorPrefix: COMMAND_MESSAGES.WATCH_FAILED,
    executeCoreRef: createDirectoryOptionsCommandExecutionRef({
      executeCore: handler.executeCore.bind(handler),
      normalizeContext: normalizeAbsentWatchContext,
      normalizeDirectory: normalizeWatchDirectory,
      normalizeOptions: normalizeWatchOptions
    })
  });
}

/**
 * Creates normalized watch signal options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized signal options.
 */
function createWatchSignalOptions(value: object): Readonly<Partial<IWatchCommandOptions>> {
  const signal: unknown = Reflect.get(value, 'signal');
  return signal instanceof AbortSignal ? { signal } : {};
}

/**
 * Creates normalized watch string options from an unknown object.
 * @param value - Candidate options object.
 * @returns Normalized string options.
 */
function createWatchStringOptions(value: object): Readonly<IWatchCommandOptions> {
  const config = getOptionalStringOption(value, WatchOptionKey.CONFIG);
  const cycles = getOptionalStringOption(value, WatchOptionKey.CYCLES);
  const dedupeAction = getOptionalStringOption(value, WatchOptionKey.DEDUPE_ACTION);
  const interval = getOptionalStringOption(value, WatchOptionKey.INTERVAL);
  const logLevel = getOptionalStringOption(value, WatchOptionKey.LOG_LEVEL);
  const output = getOptionalStringOption(value, WatchOptionKey.OUTPUT);
  const quarantineDir = getOptionalStringOption(value, WatchOptionKey.QUARANTINE_DIR);
  return {
    ...(config ? { config } : {}),
    ...(cycles ? { cycles } : {}),
    ...(dedupeAction ? { dedupeAction } : {}),
    ...(interval ? { interval } : {}),
    ...(logLevel ? { logLevel } : {}),
    ...(output ? { output } : {}),
    ...(quarantineDir ? { quarantineDir } : {})
  };
}

/**
 * Returns no explicit wrapper context for watch command execution.
 * @param value - Candidate context value.
 * @returns Undefined.
 */
function normalizeAbsentWatchContext(value: unknown): undefined {
  void value;
  return undefined;
}

/**
 * Normalizes an unknown directory argument to a watch directory string.
 * @param value - Candidate directory value.
 * @returns Directory string.
 */
function normalizeWatchDirectory(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Normalizes an unknown value to watch command options.
 * @param value - Candidate options value.
 * @returns Watch command options.
 */
function normalizeWatchOptions(value: unknown): Readonly<IWatchCommandOptions> {
  return normalizeObjectOptions<IWatchCommandOptions>(
    value,
    createWatchBooleanOptions,
    createWatchSignalOptions,
    createWatchStringOptions
  );
}
