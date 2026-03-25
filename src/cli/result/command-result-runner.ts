import type { ICommandResult } from '../interfaces';

/**
 * Builds an action callback that runs a non-directory command handler.
 * @param handler - Handler method to execute.
 * @returns Commander-compatible action callback.
 */
export function createCommandAction<TOptions>(
  handler: (options: Readonly<TOptions>) => Promise<ICommandResult>
): (options: Readonly<TOptions>) => Promise<void> {
  /**
   * Executes a non-directory command action.
   * @param options - Parsed command options.
   * @returns Promise resolving when command handling completes.
   */
  async function commandAction(options: Readonly<TOptions>): Promise<void> {
    /**
     * Runs the wrapped handler with the parsed options.
     * @returns Handler result.
     */
    async function executeHandler(): Promise<ICommandResult> {
      return handler(options);
    }

    await runCommandResult(executeHandler);
  }

  return commandAction;
}

/**
 * Builds an action callback that runs a directory-based command handler.
 * @param handler - Handler method to execute.
 * @returns Commander-compatible action callback.
 */
export function createDirectoryCommandAction<TOptions>(
  handler: (directory: string, options: Readonly<TOptions>) => Promise<ICommandResult>
): (directory: string, options: Readonly<TOptions>) => Promise<void> {
  /**
   * Executes a directory-based command action.
   * @param directory - Parsed directory argument.
   * @param options - Parsed command options.
   * @returns Promise resolving when command handling completes.
   */
  async function directoryCommandAction(
    directory: string,
    options: Readonly<TOptions>
  ): Promise<void> {
    await runCommandResult(createDirectoryHandlerExecution(handler, directory, options));
  }

  return directoryCommandAction;
}

/**
 * Creates the execution closure for a directory-based command handler.
 * @param handler - Handler method to execute.
 * @param directory - Parsed directory argument.
 * @param options - Parsed command options.
 * @returns Deferred command execution callback.
 */
function createDirectoryHandlerExecution<TOptions>(
  handler: (directory: string, options: Readonly<TOptions>) => Promise<ICommandResult>,
  directory: string,
  options: Readonly<TOptions>
): () => Promise<ICommandResult> {
  /**
   * Runs the wrapped directory handler with its parsed arguments.
   * @returns Handler result.
   */
  async function executeHandler(): Promise<ICommandResult> {
    return handler(directory, options);
  }

  return executeHandler;
}

/**
 * Executes a CLI command action and applies the resulting exit code and message.
 * @param runCommand - Command action to execute.
 * @returns Promise resolving when result handling completes.
 */
export async function runCommandResult(runCommand: () => Promise<ICommandResult>): Promise<void> {
  const result = await runCommand();

  if (result.message) {
    console.log(result.message);
  }

  Reflect.set(process, 'exitCode', result.exitCode);
}
