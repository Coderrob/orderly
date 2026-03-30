import { Command } from 'commander';

import { DedupeAction } from '../../dedupe';
import type {
  ICleanHandler,
  IDedupeHandler,
  IOrganizeHandler,
  IRevertHandler,
  IScanHandler,
  IWatchHandler
} from '../interfaces';
import {
  addAutoConfigOption,
  addConfigOption,
  addDirectoryArgument,
  addLogLevelOption
} from '../options';
import { createCommandAction, createDirectoryCommandAction } from '../result/command-result-runner';

interface IFileCommandHandlers {
  readonly clean: Readonly<ICleanHandler>;
  readonly dedupe: Readonly<IDedupeHandler>;
  readonly organize: Readonly<IOrganizeHandler>;
  readonly revert: Readonly<IRevertHandler>;
  readonly scan: Readonly<IScanHandler>;
  readonly watch: Readonly<IWatchHandler>;
}

/**
 * Adds shared config and log-level options used by file commands.
 * @param command - Command to configure.
 * @returns Configured command.
 */
function addCommonFileCommandOptions(command: Readonly<Command>): Command {
  return addAutoConfigOption(addLogLevelOption(addConfigOption(command)));
}

/**
 * Adds the shared organize-style options used by organize and watch.
 * @param command - Command to configure.
 * @returns Configured command.
 */
function addManagedDirectoryOptions(command: Readonly<Command>): Command {
  const configuredCommand = addCommonFileCommandOptions(command);
  configuredCommand.option('-d, --dry-run', 'Preview changes without applying them');
  configuredCommand.option('--no-manifest', 'Skip manifest generation');
  configuredCommand.option('-o, --output <path>', 'Output directory for organized files');
  configuredCommand.option('--dedupe', 'Enable duplicate detection before organization');
  configuredCommand.option(
    '--dedupe-action <action>',
    `Duplicate action (${Object.values(DedupeAction).join(', ')})`
  );
  configuredCommand.option(
    '--clean-empty-dirs',
    'Remove empty directories after organization completes'
  );
  configuredCommand.option(
    '--confirm-replace',
    'Explicitly confirm destructive dedupe replace actions'
  );
  configuredCommand.option(
    '--quarantine-dir <path>',
    'Move replaced duplicate files into a quarantine directory'
  );
  return configuredCommand;
}

/**
 * Creates the clean command definition.
 * @param parent - Parent command.
 * @param handler - Clean handler.
 * @returns Configured command.
 */
function createCleanCommand(parent: Readonly<Command>, handler: Readonly<ICleanHandler>): Command {
  return addDirectoryArgument(
    parent
      .command('clean')
      .description('Remove empty directories beneath the target directory')
      .action(createDirectoryCommandAction(handler.execute.bind(handler))),
    'Directory to clean'
  );
}

/**
 * Creates the dedupe command definition.
 * @param parent - Parent command.
 * @param handler - Dedupe handler.
 * @returns Configured command.
 */
function createDedupeCommand(
  parent: Readonly<Command>,
  handler: Readonly<IDedupeHandler>
): Command {
  return addDirectoryArgument(
    parent
      .command('dedupe')
      .description('Find duplicate files and optionally report or replace them')
      .action(createDirectoryCommandAction(handler.execute.bind(handler))),
    'Directory to analyze'
  );
}

/**
 * Creates the organize command definition.
 * @param parent - Parent command.
 * @param handler - Organize handler.
 * @returns Configured command.
 */
function createOrganizeCommand(
  parent: Readonly<Command>,
  handler: Readonly<IOrganizeHandler>
): Command {
  return addDirectoryArgument(
    parent
      .command('organize')
      .description('Organize files in a directory')
      .action(createDirectoryCommandAction(handler.execute.bind(handler))),
    'Directory to organize'
  );
}

/**
 * Creates the revert command definition.
 * @param parent - Parent command.
 * @param handler - Revert handler.
 * @returns Configured command.
 */
function createRevertCommand(
  parent: Readonly<Command>,
  handler: Readonly<IRevertHandler>
): Command {
  return parent
    .command('revert')
    .description('Revert file moves recorded in a manifest JSON file')
    .requiredOption('-m, --manifest <path>', 'Path to orderly manifest JSON file')
    .option('-d, --dry-run', 'Preview revert operations without moving files')
    .action(createCommandAction(handler.execute.bind(handler)));
}

/**
 * Creates the scan command definition.
 * @param parent - Parent command.
 * @param handler - Scan handler.
 * @returns Configured command.
 */
function createScanCommand(parent: Readonly<Command>, handler: Readonly<IScanHandler>): Command {
  return addDirectoryArgument(
    parent
      .command('scan')
      .description('Scan a directory and show what would be organized')
      .action(createDirectoryCommandAction(handler.execute.bind(handler))),
    'Directory to scan'
  );
}

/**
 * Creates the watch command definition.
 * @param parent - Parent command.
 * @param handler - Watch handler.
 * @returns Configured command.
 */
function createWatchCommand(parent: Readonly<Command>, handler: Readonly<IWatchHandler>): Command {
  return addDirectoryArgument(
    parent
      .command('watch')
      .description('Continuously organize a directory on a polling interval')
      .action(createDirectoryCommandAction(handler.execute.bind(handler))),
    'Directory to watch'
  );
}

/**
 * Registers the clean command on a parent command.
 * @param parent - Parent command.
 * @param handler - Clean handler.
 */
function registerCleanCommand(parent: Readonly<Command>, handler: Readonly<ICleanHandler>): void {
  const command = addCommonFileCommandOptions(createCleanCommand(parent, handler));
  command.option('--dry-run', 'Preview directories that would be removed');
  command.option('--include-hidden', 'Allow deleting empty hidden directories');
  command.option('--remove-orderly-dir', 'Allow deleting an empty .orderly directory');
}

/**
 * Registers the dedupe command on a parent command.
 * @param parent - Parent command.
 * @param handler - Dedupe handler.
 */
function registerDedupeCommand(parent: Readonly<Command>, handler: Readonly<IDedupeHandler>): void {
  const command = addCommonFileCommandOptions(createDedupeCommand(parent, handler));
  command.option('-d, --dry-run', 'Preview actions without deleting files');
  command.option('--action <action>', `Dedupe action (${Object.values(DedupeAction).join(', ')})`);
  command.option('--preset <preset>', 'Strategy preset (fast, safe, exact, media)', 'safe');
  command.option('--confirm-replace', 'Explicitly confirm destructive replace actions');
  command.option('--quarantine-dir <path>', 'Move replaced files into a quarantine directory');
  command.option('--report-json <path>', 'Write JSON report to the provided path');
  command.option('--report-markdown <path>', 'Write Markdown report to the provided path');
}

/**
 * Registers grouped file commands.
 * @param program - Root commander program.
 * @param handlers - File command handlers.
 */
export function registerFilesCommandGroup(
  program: Readonly<Command>,
  handlers: Readonly<IFileCommandHandlers>
): void {
  const filesCommand = program.command('files').description('File scanning and organization tools');
  registerScanCommand(filesCommand, handlers.scan);
  registerOrganizeCommand(filesCommand, handlers.organize);
  registerCleanCommand(filesCommand, handlers.clean);
  registerDedupeCommand(filesCommand, handlers.dedupe);
  registerRevertCommand(filesCommand, handlers.revert);
  registerWatchCommand(filesCommand, handlers.watch);
}

/**
 * Registers the organize command on a parent command.
 * @param parent - Parent command.
 * @param handler - Organize handler.
 */
function registerOrganizeCommand(
  parent: Readonly<Command>,
  handler: Readonly<IOrganizeHandler>
): void {
  addManagedDirectoryOptions(createOrganizeCommand(parent, handler));
}

/**
 * Registers the revert command on a parent command.
 * @param parent - Parent command.
 * @param handler - Revert handler.
 */
function registerRevertCommand(parent: Readonly<Command>, handler: Readonly<IRevertHandler>): void {
  createRevertCommand(parent, handler);
}

/**
 * Registers the scan command on a parent command.
 * @param parent - Parent command.
 * @param handler - Scan handler.
 */
function registerScanCommand(parent: Readonly<Command>, handler: Readonly<IScanHandler>): void {
  const command = addCommonFileCommandOptions(createScanCommand(parent, handler));
  command.option('--format <format>', 'Output format (table, json, csv)', 'table');
}

/**
 * Registers the watch command on a parent command.
 * @param parent - Parent command.
 * @param handler - Watch handler.
 */
function registerWatchCommand(parent: Readonly<Command>, handler: Readonly<IWatchHandler>): void {
  const command = addManagedDirectoryOptions(createWatchCommand(parent, handler));
  command.option('--interval <seconds>', 'Polling interval in seconds', '5');
  command.option('--cycles <count>', 'Number of cycles before exiting; 0 means continuous', '0');
}
