import { Command } from 'commander';

import { CLI_CONSTANTS } from '../constants';
import type { IConfigValidateHandler, IInitHandler } from '../interfaces';
import { createCommandAction } from '../result/command-result-runner';

/**
 * Registers grouped config commands.
 * @param program - Root commander program.
 * @param initHandler - Init command handler.
 */
export function registerConfigCommandGroup(
  program: Readonly<Command>,
  handlers: Readonly<{ init: Readonly<IInitHandler>; validate: Readonly<IConfigValidateHandler> }>
): void {
  const configCommand = program.command('config').description('Configuration management');
  registerInitCommand(configCommand, handlers.init);
  registerValidateCommand(configCommand, handlers.validate);
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
    .option(
      '-t, --template <template>',
      'Starter template (downloads, media-library, developer-workspace, photos-only)',
      'downloads'
    )
    .action(createCommandAction(initHandler.execute.bind(initHandler)));
}

/**
 * Registers the validate command on a parent command.
 * @param parent - Parent command.
 * @param validateHandler - Validate command handler.
 */
function registerValidateCommand(
  parent: Readonly<Command>,
  validateHandler: Readonly<IConfigValidateHandler>
): void {
  parent
    .command('validate')
    .description('Validate an existing configuration file')
    .option('-c, --config <path>', 'Path to config file')
    .option('-d, --directory <path>', 'Directory to search for an auto-discovered config')
    .action(createCommandAction(validateHandler.execute.bind(validateHandler)));
}
