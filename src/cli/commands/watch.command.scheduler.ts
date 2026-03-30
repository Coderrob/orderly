import type { ICommandResult, IWatchCommandOptions } from '../interfaces';

const ABORT_ERROR_NAME = 'AbortError';
const SECOND_TO_MILLISECOND = 1000;

export interface IRunCyclesOptions {
  readonly completedCycles: number;
  readonly cycleLimit: number;
  readonly directory: string;
  readonly executeCycle: (
    directory: string,
    options: Readonly<IWatchCommandOptions>
  ) => Promise<ICommandResult>;
  readonly hasReachedCycleLimit: (completedCycles: number, cycleLimit: number) => boolean;
  readonly intervalSeconds: number;
  readonly options: Readonly<IWatchCommandOptions>;
  readonly signal?: AbortSignal;
}

interface IRunCycleExecutionOptions extends IRunCyclesOptions {
  readonly reject: (error?: unknown) => void;
  readonly resolve: (completedCycles: number) => void;
  readonly scheduleDelay: (durationMs: number, callback: () => void) => void;
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
  readonly reject: (error?: unknown) => void;
  readonly resolve: (completedCycles: number) => void;
  readonly scheduleDelay: (durationMs: number, callback: () => void) => void;
  readonly signal?: AbortSignal;
}

interface ITimeoutHandleState {
  readonly clearHandle: () => void;
  readonly getHandle: () => NodeJS.Timeout | undefined;
  readonly setHandle: (handle: Readonly<NodeJS.Timeout>) => void;
}

interface ICleanupRef {
  readonly invokeCleanup: () => void;
  readonly setCleanup: (nextCleanup: () => void) => void;
}

/**
 * Creates the scheduler cleanup for one watch execution.
 * @param runOptions - Initial cycle options.
 * @param cleanupRef - Mutable cleanup callback reference.
 * @param onAbort - Abort event listener.
 * @param timeoutHandleState - Mutable timeout-handle accessors.
 */
function configureWatchSchedulerCleanup(
  runOptions: Readonly<IRunCyclesOptions>,
  cleanupRef: Readonly<ICleanupRef>,
  onAbort: () => void,
  timeoutHandleState: Readonly<ITimeoutHandleState>
): void {
  cleanupRef.setCleanup(
    createWatchSchedulerCleanup(
      runOptions.signal,
      onAbort,
      timeoutHandleState.getHandle,
      timeoutHandleState.clearHandle
    )
  );
}

/**
 * Creates mutable cleanup accessors for one watch execution.
 * @returns Cleanup callback accessors.
 */
function createCleanupRef(): Readonly<ICleanupRef> {
  let cleanup = createWatchSchedulerNoop;
  return {
    /** Invokes the current cleanup callback. */
    invokeCleanup(): void {
      cleanup();
    },
    /**
     * Replaces the current cleanup callback.
     * @param nextCleanup - Next cleanup callback.
     */
    setCleanup(nextCleanup: () => void): void {
      cleanup = nextCleanup;
    }
  };
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
 * Creates the immutable state object used by the watch scheduler.
 * @param runOptions - Cycle execution options.
 * @returns Cycle state.
 */
function createRunCycleState(
  runOptions: Readonly<IRunCycleExecutionOptions>
): Readonly<IRunCycleState> {
  return {
    completedCycles: runOptions.completedCycles,
    cycleLimit: runOptions.cycleLimit,
    directory: runOptions.directory,
    executeCycle: runOptions.executeCycle,
    hasReachedCycleLimit: runOptions.hasReachedCycleLimit,
    intervalMs: runOptions.intervalSeconds * SECOND_TO_MILLISECOND,
    options: runOptions.options,
    reject: runOptions.reject,
    resolve: runOptions.resolve,
    scheduleDelay: runOptions.scheduleDelay,
    signal: runOptions.signal
  };
}

/**
 * Handles one successful cycle and schedules the next delayed execution.
 * @param runCycleState - Immutable cycle state snapshot.
 * @returns Next cycle state snapshot.
 */
function createSuccessfulCycleState(
  runCycleState: Readonly<IRunCycleState>
): Readonly<IRunCycleState> {
  return createUpdatedRunCycleState(runCycleState);
}

/**
 * Creates mutable timeout-handle accessors for one watch execution.
 * @returns Timeout-handle state accessors.
 */
function createTimeoutHandleState(): Readonly<ITimeoutHandleState> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  return {
    /** Clears the stored timeout handle reference. */
    clearHandle(): void {
      timeoutHandle = undefined;
    },
    /** @returns Current timeout handle, if any. */
    getHandle(): NodeJS.Timeout | undefined {
      return timeoutHandle;
    },
    /**
     * Stores the active timeout handle.
     * @param handle - Active timeout handle.
     */
    setHandle(handle: Readonly<NodeJS.Timeout>): void {
      timeoutHandle = handle;
    }
  };
}

/**
 * Creates the next immutable cycle state after one completed iteration.
 * @param runCycleState - Current cycle state.
 * @returns Updated cycle state.
 */
function createUpdatedRunCycleState(
  runCycleState: Readonly<IRunCycleState>
): Readonly<IRunCycleState> {
  return {
    ...runCycleState,
    completedCycles: runCycleState.completedCycles + 1
  };
}

/**
 * Creates an abort error for watch cancellation.
 * @returns Abort error.
 */
function createWatchAbortError(): Error {
  return new WatchAbortError();
}

/**
 * Creates the abort listener used by the watch scheduler.
 * @param reject - Scheduler reject callback.
 * @returns Abort event listener.
 */
function createWatchAbortListener(reject: (error?: unknown) => void): () => void {
  /**
   * Rejects the watch scheduler after cancellation.
   */
  function onAbort(): void {
    reject(createWatchAbortError());
  }

  return onAbort;
}

/**
 * Creates the delay scheduler used by watch mode.
 * @param setHandle - Timeout-handle setter.
 * @returns Delay scheduler.
 */
function createWatchDelayScheduler(
  setHandle: (handle: Readonly<NodeJS.Timeout>) => void
): (durationMs: number, callback: () => void) => void {
  /**
   * Schedules one delayed watch callback.
   * @param durationMs - Delay duration in milliseconds.
   * @param callback - Delayed callback.
   */
  function scheduleDelay(durationMs: number, callback: () => void): void {
    setHandle(setTimeout(callback, durationMs));
  }

  return scheduleDelay;
}

/**
 * Creates the rejected-cycle callback.
 * @param cleanup - Scheduler cleanup callback.
 * @param reject - Promise rejection callback.
 * @returns Wrapped rejection callback.
 */
function createWatchRejectCallback(
  cleanup: () => void,
  reject: (error?: unknown) => void
): (error?: unknown) => void {
  /**
   * Cleans up scheduler resources before rejecting.
   * @param error - Rejection error.
   */
  function wrappedReject(error?: unknown): void {
    cleanup();
    reject(error);
  }

  return wrappedReject;
}

/**
 * Creates the resolved-cycle callback.
 * @param cleanup - Scheduler cleanup callback.
 * @param resolve - Promise resolution callback.
 * @returns Wrapped resolution callback.
 */
function createWatchResolveCallback(
  cleanup: () => void,
  resolve: (completedCycles: number) => void
): (completedCycles: number) => void {
  /**
   * Cleans up scheduler resources before resolving.
   * @param completedCycles - Completed watch cycle count.
   */
  function wrappedResolve(completedCycles: number): void {
    cleanup();
    resolve(completedCycles);
  }

  return wrappedResolve;
}

/**
 * Creates scheduler callbacks and resources for one watch execution.
 * @param runOptions - Initial cycle options.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 * @returns Scheduler callbacks and listeners.
 */
function createWatchSchedulerCallbacks(
  runOptions: Readonly<IRunCyclesOptions>,
  resolve: (completedCycles: number) => void,
  reject: (error?: unknown) => void
): Readonly<{
  onAbort: () => void;
  scheduleDelay: (durationMs: number, callback: () => void) => void;
  wrappedReject: (error?: unknown) => void;
  wrappedResolve: (completedCycles: number) => void;
}> {
  const timeoutHandleState = createTimeoutHandleState();
  const cleanupRef = createCleanupRef();
  const wrappedReject = createWatchRejectCallback(cleanupRef.invokeCleanup, reject);
  const onAbort = createWatchAbortListener(wrappedReject);
  configureWatchSchedulerCleanup(runOptions, cleanupRef, onAbort, timeoutHandleState);

  return {
    onAbort,
    scheduleDelay: createWatchDelayScheduler(timeoutHandleState.setHandle),
    wrappedReject,
    wrappedResolve: createWatchResolveCallback(cleanupRef.invokeCleanup, resolve)
  };
}

/**
 * Creates the scheduler cleanup callback.
 * @param signal - Optional watch abort signal.
 * @param onAbort - Abort event listener.
 * @param getHandle - Timeout-handle accessor.
 * @param clearHandle - Timeout-handle clearer.
 * @returns Cleanup callback.
 */
function createWatchSchedulerCleanup(
  signal: AbortSignal | undefined,
  onAbort: () => void,
  getHandle: () => NodeJS.Timeout | undefined,
  clearHandle: () => void
): () => void {
  /**
   * Removes the pending timeout and abort listener.
   */
  function cleanup(): void {
    const timeoutHandle = getHandle();
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      clearHandle();
    }

    signal?.removeEventListener('abort', onAbort);
  }

  return cleanup;
}

/**
 * Returns the default cleanup callback used before scheduler wiring completes.
 */
function createWatchSchedulerNoop(): void {}

/**
 * Executes the next scheduled watch cycle.
 * @param runCycleState - Immutable cycle state snapshot.
 */
function executeScheduledCycle(runCycleState: Readonly<IRunCycleState>): void {
  if (runCycleState.signal?.aborted) {
    runCycleState.reject(createWatchAbortError());
    return;
  }

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

  nextRunCycleState.scheduleDelay(
    nextRunCycleState.intervalMs,
    scheduleDelayedCycle.bind(null, nextRunCycleState)
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
 * @param runOptions - Initial cycle state.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 */
export function startScheduledCycles(
  runOptions: Readonly<IRunCyclesOptions>,
  resolve: (completedCycles: number) => void,
  reject: (error?: unknown) => void
): void {
  const callbacks = createWatchSchedulerCallbacks(runOptions, resolve, reject);

  runOptions.signal?.addEventListener('abort', callbacks.onAbort, { once: true });
  executeScheduledCycle(
    createRunCycleState({
      ...runOptions,
      reject: callbacks.wrappedReject,
      resolve: callbacks.wrappedResolve,
      scheduleDelay: callbacks.scheduleDelay
    })
  );
}

/**
 * Abort error used by watch cancellation.
 */
class WatchAbortError extends Error {
  override name = ABORT_ERROR_NAME;

  /**
   * Creates a new watch abort error.
   */
  constructor() {
    super('Watch cancelled');
  }
}
