import { Command } from 'commander';

import type { IInitHandler } from '../interfaces';
import { addFormatOption } from '../options/shared-options';
import { createCommandAction } from '../result/command-result-runner';

/**
 * Registers config-related commands.
 * @param rootCommand - Root command to augment.
 * @param initHandler - Init command handler.
 * @returns The created config command group.
 */
export function registerConfigCommandGroup(
  rootCommand: Readonly<Command>,
  initHandler: Readonly<IInitHandler>
): Command {
  const configCommand = rootCommand.command('config').description('Configuration commands');
  registerInitCommand(configCommand, initHandler);
  return configCommand;
}

/**
 * Registers the config init command on a parent command.
 * @param parentCommand - Parent command to augment.
 * @param initHandler - Init command handler.
 * @returns The created init command.
 */
export function registerInitCommand(
  parentCommand: Readonly<Command>,
  initHandler: Readonly<IInitHandler>
): Command {
  const initCommand = parentCommand
    .command('init')
    .description('Initialize a new configuration file');
  addFormatOption(initCommand);
  initCommand.action(createCommandAction(initHandler.execute.bind(initHandler)));
  return initCommand;
}
