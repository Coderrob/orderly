import type { Command } from 'commander';

import { CLI_CONSTANTS } from '../constants';

/**
 * Adds the shared auto-config toggle used by directory commands.
 * @param command - Command to augment.
 * @returns The augmented command.
 */
export function addAutoConfigOption(command: Readonly<Command>): Command {
  return command.option(
    '--no-auto-config',
    'Disable auto-discovery of config files in target directory'
  );
}

/**
 * Adds the shared config-file option used by config-driven commands.
 * @param command - Command to augment.
 * @returns The augmented command.
 */
export function addConfigOption(command: Readonly<Command>): Command {
  return command.option('-c, --config <path>', 'Path to config file');
}

/**
 * Adds the standard dry-run option.
 * @param command - Command to augment.
 * @returns The augmented command.
 */
export function addDryRunOption(command: Readonly<Command>): Command {
  return command.option('-d, --dry-run', 'Preview changes without applying them');
}

/**
 * Adds the standard config format option.
 * @param command - Command to augment.
 * @returns The augmented command.
 */
export function addFormatOption(command: Readonly<Command>): Command {
  return command.option(
    '-f, --format <format>',
    `Config file format (${CLI_CONSTANTS.VALID_FORMATS.join(', ')})`,
    CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT
  );
}

/**
 * Adds the shared log-level option used by runtime commands.
 * @param command - Command to augment.
 * @returns The augmented command.
 */
export function addLogLevelOption(command: Readonly<Command>): Command {
  return command.option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info');
}

/**
 * Adds the standard manifest toggle.
 * @param command - Command to augment.
 * @returns The augmented command.
 */
export function addManifestOption(command: Readonly<Command>): Command {
  return command.option('--no-manifest', 'Skip manifest generation');
}
