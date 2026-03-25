import { COMMAND_MESSAGES, ExitCode } from '../constants';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type {
  ICommandResult,
  IOrganizeHandler,
  IWatchCommandOptions,
  IWatchHandler
} from '../interfaces';

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

interface IRunCyclePromiseHandlers {
  readonly reject: (error?: unknown) => void;
  readonly resolve: (completedCycles: number) => void;
}

interface IRunCycleState {
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

/**
 * Handler for continuous polling-based watch mode.
 */
export class WatchHandler implements IWatchHandler {
  /**
   * Creates a new watch command handler.
   * @param organizeHandler - Organize handler used for each cycle.
   */
  constructor(private readonly organizeHandler: Readonly<IOrganizeHandler>) {}

  /**
   * Executes watch mode.
   * @param directory - Target directory.
   * @param options - Watch options.
   * @returns Command result.
   */
  @WithCommandTelemetry('watch')
  @HandleCommandErrors(COMMAND_MESSAGES.WATCH_FAILED)
  async execute(
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
   * Runs watch cycles recursively until the requested limit is reached.
   * @param directory - Target directory.
   * @param options - Watch options.
   * @param intervalSeconds - Polling interval in seconds.
   * @param cycleLimit - Requested cycle limit.
   * @param completedCycles - Completed cycle count.
   * @returns Completed cycle count.
   */
  private async runCycles(runOptions: Readonly<IRunCyclesOptions>): Promise<number> {
    return await new Promise<number>(
      startCycleRunner.bind(
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
 * Creates the watch-cycle state object used by the scheduler.
 * @param runOptions - Cycle execution options.
 * @param executeCycle - Organize-cycle executor.
 * @param hasReachedCycleLimit - Cycle limit predicate.
 * @returns Cycle scheduler state.
 */
function createRunCycleState(
  runOptions: Readonly<IRunCyclesOptions>,
  executeCycle: (
    directory: string,
    options: Readonly<IWatchCommandOptions>
  ) => Promise<ICommandResult>,
  hasReachedCycleLimit: (completedCycles: number, cycleLimit: number) => boolean
): Readonly<IRunCycleState> {
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
 * Starts the long-running watch-cycle executor promise.
 * @param runCycleState - Cycle execution state.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 */
function startCycleRunner(
  runCycleState: Readonly<IRunCycleState>,
  resolve: (completedCycles: number) => void,
  reject: (error?: unknown) => void
): void {
  scheduleCycleExecution(runCycleState, { resolve, reject });
}

/**
 * Schedules the next watch cycle without building a recursive await chain.
 * @param runCycleState - Cycle execution state.
 * @param handlers - Promise resolution handlers.
 */
function scheduleCycleExecution(
  runCycleState: Readonly<IRunCycleState>,
  handlers: Readonly<IRunCyclePromiseHandlers>
): void {
  if (runCycleState.hasReachedCycleLimit(runCycleState.completedCycles, runCycleState.cycleLimit)) {
    handlers.resolve(runCycleState.completedCycles);
    return;
  }

  void Promise.resolve(runCycleState.executeCycle(runCycleState.directory, runCycleState.options))
    .then(handleCompletedCycle.bind(null, runCycleState, handlers))
    .catch(handlers.reject);
}

/**
 * Handles completion of one watch cycle and schedules the next delay when needed.
 * @param runCycleState - Cycle execution state.
 * @param handlers - Promise resolution handlers.
 */
function handleCompletedCycle(
  runCycleState: Readonly<IRunCycleState>,
  handlers: Readonly<IRunCyclePromiseHandlers>
): void {
  const completedCycles = runCycleState.completedCycles + 1;
  if (runCycleState.hasReachedCycleLimit(completedCycles, runCycleState.cycleLimit)) {
    handlers.resolve(completedCycles);
    return;
  }

  delay(runCycleState.intervalMs)
    .then(
      scheduleCycleExecution.bind(null, {
        ...runCycleState,
        completedCycles
      }, handlers)
    )
    .catch(handlers.reject);
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
 * Resolves the timeout callback.
 * @param resolve - Promise resolution callback.
 * @param durationMs - Delay duration in milliseconds.
 */
function waitForDelay(durationMs: number, resolve: () => void): void {
  setTimeout(resolve, durationMs);
}
