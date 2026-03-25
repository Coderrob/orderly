import type { Command } from 'commander';

const DEFAULT_DIRECTORY_ARGUMENT = '.';

/**
 * Registers the standard directory argument used by directory-oriented commands.
 * @param command - Command to augment.
 * @param description - Help text for the directory argument.
 * @returns The augmented command.
 */
export function addDirectoryArgument(command: Readonly<Command>, description: string): Command {
  return command.argument('[directory]', description, DEFAULT_DIRECTORY_ARGUMENT);
}
