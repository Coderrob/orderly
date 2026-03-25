import type { Command } from 'commander';

/**
 * Adds the standard auto-config toggle to a command.
 * @param command - Command being configured.
 * @returns Configured command.
 */
export function addAutoConfigOption(command: Readonly<Command>): Command {
  return command.option(
    '--no-auto-config',
    'Disable auto-discovery of config files in target directory'
  );
}

/**
 * Adds the standard config-path option to a command.
 * @param command - Command being configured.
 * @returns Configured command.
 */
export function addConfigOption(command: Readonly<Command>): Command {
  return command.option('-c, --config <path>', 'Path to config file');
}

/**
 * Adds the standard log-level option to a command.
 * @param command - Command being configured.
 * @returns Configured command.
 */
export function addLogLevelOption(command: Readonly<Command>): Command {
  return command.option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info');
}
