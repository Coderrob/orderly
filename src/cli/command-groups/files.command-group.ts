import { Command } from 'commander';

import type { ICleanHandler, IOrganizeHandler, IScanHandler } from '../interfaces';
import { addDirectoryArgument } from '../options/shared-arguments';
import {
  addAutoConfigOption,
  addConfigOption,
  addDryRunOption,
  addLogLevelOption,
  addManifestOption
} from '../options/shared-options';
import { createDirectoryCommandAction } from '../result/command-result-runner';

/**
 * Registers the clean command on a parent command.
 * @param parentCommand - Parent command to augment.
 * @param cleanHandler - Clean command handler.
 * @returns The created clean command.
 */
export function registerCleanCommand(
  parentCommand: Readonly<Command>,
  cleanHandler: Readonly<ICleanHandler>
): Command {
  const cleanCommand = parentCommand
    .command('clean')
    .description('Remove empty folders beneath a directory');

  addDirectoryArgument(cleanCommand, 'Directory to clean');
  addDryRunOption(cleanCommand);
  addLogLevelOption(cleanCommand);
  cleanCommand.option('--include-hidden', 'Include hidden directories in the cleaning pass');
  cleanCommand.option('--remove-orderly-dir', 'Allow deletion of an empty .orderly directory');
  cleanCommand.action(createDirectoryCommandAction(cleanHandler.execute.bind(cleanHandler)));
  return cleanCommand;
}

/**
 * Registers file-oriented commands.
 * @param rootCommand - Root command to augment.
 * @param dependencies - Handlers used by the files command group.
 * @returns The created files command group.
 */
export function registerFilesCommandGroup(
  rootCommand: Readonly<Command>,
  dependencies: Readonly<{
    cleanHandler: ICleanHandler;
    organizeHandler: IOrganizeHandler;
    scanHandler: IScanHandler;
  }>
): Command {
  const filesCommand = rootCommand.command('files').description('File and directory operations');
  registerScanCommand(filesCommand, dependencies.scanHandler);
  registerOrganizeCommand(filesCommand, dependencies.organizeHandler);
  registerCleanCommand(filesCommand, dependencies.cleanHandler);
  return filesCommand;
}

/**
 * Registers the organize command on a parent command.
 * @param parentCommand - Parent command to augment.
 * @param organizeHandler - Organize command handler.
 * @returns The created organize command.
 */
export function registerOrganizeCommand(
  parentCommand: Readonly<Command>,
  organizeHandler: Readonly<IOrganizeHandler>
): Command {
  const organizeCommand = parentCommand
    .command('organize')
    .description('Organize files in a directory');

  addDirectoryArgument(organizeCommand, 'Directory to organize');
  addConfigOption(organizeCommand);
  addDryRunOption(organizeCommand);
  addManifestOption(organizeCommand);
  addLogLevelOption(organizeCommand);
  organizeCommand.option('-o, --output <path>', 'Output directory for organized files');
  organizeCommand.option('--dedupe', 'Enable duplicate detection');
  organizeCommand.option('--dedupe-action <action>', 'Duplicate action (skip, report, replace)');
  addAutoConfigOption(organizeCommand);
  organizeCommand.action(
    createDirectoryCommandAction(organizeHandler.execute.bind(organizeHandler))
  );
  return organizeCommand;
}

/**
 * Registers the scan command on a parent command.
 * @param parentCommand - Parent command to augment.
 * @param scanHandler - Scan command handler.
 * @returns The created scan command.
 */
export function registerScanCommand(
  parentCommand: Readonly<Command>,
  scanHandler: Readonly<IScanHandler>
): Command {
  const scanCommand = parentCommand
    .command('scan')
    .description('Scan a directory and show what would be organized');

  addDirectoryArgument(scanCommand, 'Directory to scan');
  addConfigOption(scanCommand);
  addLogLevelOption(scanCommand);
  addAutoConfigOption(scanCommand);
  scanCommand.action(createDirectoryCommandAction(scanHandler.execute.bind(scanHandler)));
  return scanCommand;
}
