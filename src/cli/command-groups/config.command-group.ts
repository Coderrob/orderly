import { Command } from 'commander';

import { CLI_CONSTANTS } from '../constants';
import type { IInitHandler } from '../interfaces';
import { createCommandAction } from '../result/command-result-runner';

/**
 * Registers grouped config commands.
 * @param program - Root commander program.
 * @param initHandler - Init command handler.
 */
export function registerConfigCommandGroup(
  program: Readonly<Command>,
  initHandler: Readonly<IInitHandler>
): void {
  registerInitCommand(
    program.command('config').description('Configuration management'),
    initHandler
  );
}

/**
 * Registers the init command on a parent command.
 * @param parent - Parent command.
 * @param initHandler - Init command handler.
 */
function registerInitCommand(parent: Readonly<Command>, initHandler: Readonly<IInitHandler>): void {
  parent
    .command('init')
    .description('Initialize a new configuration file')
    .option(
      '-f, --format <format>',
      `Config file format (${CLI_CONSTANTS.VALID_FORMATS.join(', ')})`,
      CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT
    )
    .action(createCommandAction(initHandler.execute.bind(initHandler)));
}
