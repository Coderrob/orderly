import type { Command } from 'commander';

/**
 * Adds the standard optional directory argument to a command.
 * @param command - Command being configured.
 * @param description - Directory argument description.
 * @returns Configured command.
 */
export function addDirectoryArgument(command: Readonly<Command>, description: string): Command {
  return command.argument('[directory]', description, '.');
}
