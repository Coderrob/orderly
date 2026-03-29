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

const DEFAULT_INTERVAL_SECONDS = 5;
const MINIMUM_INTERVAL_SECONDS = 1;
const CONTINUOUS_CYCLE_COUNT = 0;
const SECOND_TO_MILLISECOND = 1000;

interface IRunCyclesOptions {
  readonly completedCycles: number;
  readonly cycleLimit: number;
  readonly directory: string;
  readonly intervalSeconds: number;
  readonly options: Readonly<IWatchCommandOptions>;
}

interface IRunCycleBaseState {
  readonly completedCycles: number;
  readonly cycleLimit: number;
  readonly directory: string;
  readonly executeCycle: (
    directory: string,
    options: Readonly<IWatchCommandOptions>
  ) => Promise<ICommandResult>;
  readonly hasReachedCycleLimit: (completedCycles: number, cycleLimit: number) => boolean;
  readonly intervalMs: number;
  readonly options: Readonly<IWatchCommandOptions>;
}

interface IRunCycleState extends IRunCycleBaseState {
  readonly reject: (error?: unknown) => void;
  readonly resolve: (completedCycles: number) => void;
}

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
    const intervalSeconds = this.resolveIntervalSeconds(options.interval);
    const cycleLimit = this.resolveCycleLimit(options.cycles);
    const completedCycles = await this.runCycles({
      completedCycles: 0,
      cycleLimit,
      directory,
      intervalSeconds,
      options
    });

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.WATCH_SUCCESS.replace('{0}', String(completedCycles))
    };
  }

  /**
   * Runs watch cycles until the requested limit is reached.
   * @param runOptions - Watch cycle execution options.
   * @returns Completed cycle count.
   */
  private async runCycles(runOptions: Readonly<IRunCyclesOptions>): Promise<number> {
    return new Promise<number>(
      startScheduledCycles.bind(
        null,
        createRunCycleState(
          runOptions,
          this.organizeHandler.execute.bind(this.organizeHandler),
          this.hasReachedCycleLimit.bind(this)
        )
      )
    );
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
}

/**
 * Converts an unsuccessful cycle result into a scheduler error.
 * @param cycleResult - Command result returned by one organize cycle.
 * @returns Error describing the failed watch cycle.
 */
function createCycleFailure(cycleResult: Readonly<ICommandResult>): Error {
  return new Error(cycleResult.message);
}

/**
 * Creates the mutable state object used by the watch scheduler.
 * @param runOptions - Cycle execution options.
 * @param executeCycle - Organize-cycle executor.
 * @param hasReachedCycleLimit - Cycle limit predicate.
 * @returns Cycle state.
 */
function createRunCycleState(
  runOptions: Readonly<IRunCyclesOptions>,
  executeCycle: (
    directory: string,
    options: Readonly<IWatchCommandOptions>
  ) => Promise<ICommandResult>,
  hasReachedCycleLimit: (completedCycles: number, cycleLimit: number) => boolean
): IRunCycleBaseState {
  return {
    completedCycles: runOptions.completedCycles,
    cycleLimit: runOptions.cycleLimit,
    directory: runOptions.directory,
    executeCycle,
    hasReachedCycleLimit,
    intervalMs: runOptions.intervalSeconds * SECOND_TO_MILLISECOND,
    options: runOptions.options
  };
}

/**
 * Handles one successful cycle and schedules the next delayed execution.
 * @param runCycleState - Immutable cycle state snapshot.
 * @returns Next cycle state snapshot.
 */
function createSuccessfulCycleState(runCycleState: Readonly<IRunCycleState>): IRunCycleState {
  return createUpdatedRunCycleState(runCycleState);
}

/**
 * Creates the next immutable cycle state after one completed iteration.
 * @param runCycleState - Current cycle state.
 * @returns Updated cycle state.
 */
function createUpdatedRunCycleState(runCycleState: Readonly<IRunCycleState>): IRunCycleState {
  return {
    ...runCycleState,
    completedCycles: runCycleState.completedCycles + 1
  };
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
 * Waits for the provided duration.
 * @param durationMs - Delay duration in milliseconds.
 * @returns Promise resolving after the delay.
 */
function delay(durationMs: number): Promise<void> {
  return new Promise(waitForDelay.bind(null, durationMs));
}

/**
 * Executes the next scheduled watch cycle.
 * @param runCycleState - Immutable cycle state snapshot.
 */
function executeScheduledCycle(runCycleState: Readonly<IRunCycleState>): void {
  if (runCycleState.hasReachedCycleLimit(runCycleState.completedCycles, runCycleState.cycleLimit)) {
    runCycleState.resolve(runCycleState.completedCycles);
    return;
  }

  void runCycleState
    .executeCycle(runCycleState.directory, runCycleState.options)
    .then(handleExecutedCycle.bind(null, runCycleState))
    .catch(runCycleState.reject);
}

/**
 * Handles the completed cycle and schedules the next delay when needed.
 * @param runCycleState - Immutable cycle state snapshot.
 * @param cycleResult - Result returned by the completed organize cycle.
 */
function handleExecutedCycle(
  runCycleState: Readonly<IRunCycleState>,
  cycleResult: Readonly<ICommandResult>
): void {
  if (!cycleResult.success) {
    handleFailedCycleResult(runCycleState, cycleResult);
    return;
  }

  handleSuccessfulCycleResult(runCycleState);
}

/**
 * Rejects the scheduler when an organize cycle returns an unsuccessful result.
 * @param runCycleState - Immutable cycle state snapshot.
 * @param cycleResult - Result returned by the completed organize cycle.
 */
function handleFailedCycleResult(
  runCycleState: Readonly<IRunCycleState>,
  cycleResult: Readonly<ICommandResult>
): void {
  runCycleState.reject(createCycleFailure(cycleResult));
}

/**
 * Handles scheduler flow after a successful organize cycle.
 * @param runCycleState - Immutable cycle state snapshot.
 */
function handleSuccessfulCycleResult(runCycleState: Readonly<IRunCycleState>): void {
  const nextRunCycleState = createSuccessfulCycleState(runCycleState);
  if (
    nextRunCycleState.hasReachedCycleLimit(
      nextRunCycleState.completedCycles,
      nextRunCycleState.cycleLimit
    )
  ) {
    nextRunCycleState.resolve(nextRunCycleState.completedCycles);
    return;
  }

  delay(nextRunCycleState.intervalMs)
    .then(scheduleDelayedCycle.bind(null, nextRunCycleState))
    .catch(nextRunCycleState.reject);
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
    createWatchStringOptions
  );
}

/**
 * Schedules the next watch cycle after the polling delay.
 * @param runCycleState - Immutable cycle state snapshot.
 */
function scheduleDelayedCycle(runCycleState: Readonly<IRunCycleState>): void {
  executeScheduledCycle(runCycleState);
}

/**
 * Starts the long-running watch scheduler.
 * @param runCycleState - Initial cycle state.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 */
function startScheduledCycles(
  runCycleState: Readonly<IRunCycleBaseState>,
  resolve: (completedCycles: number) => void,
  reject: (error?: unknown) => void
): void {
  executeScheduledCycle({ ...runCycleState, resolve, reject });
}

/**
 * Resolves the timeout callback.
 * @param resolve - Promise resolution callback.
 * @param durationMs - Delay duration in milliseconds.
 */
function waitForDelay(durationMs: number, resolve: () => void): void {
  setTimeout(resolve, durationMs);
}
