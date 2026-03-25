import { Command } from 'commander';

import { DedupeAction } from '../../dedupe';
import type { ICleanHandler, IDedupeHandler, IOrganizeHandler, IScanHandler } from '../interfaces';
import {
  addAutoConfigOption,
  addConfigOption,
  addDirectoryArgument,
  addLogLevelOption
} from '../options';
import { createDirectoryCommandAction } from '../result/command-result-runner';

interface IFileCommandHandlers {
  readonly clean: Readonly<ICleanHandler>;
  readonly dedupe: Readonly<IDedupeHandler>;
  readonly organize: Readonly<IOrganizeHandler>;
  readonly scan: Readonly<IScanHandler>;
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
 * Registers the clean command on a parent command.
 * @param parent - Parent command.
 * @param handler - Clean handler.
 */
function registerCleanCommand(parent: Readonly<Command>, handler: Readonly<ICleanHandler>): void {
  const command = createCleanCommand(parent, handler);
  addAutoConfigOption(addLogLevelOption(addConfigOption(command)));
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
  const command = createDedupeCommand(parent, handler);
  addAutoConfigOption(addLogLevelOption(addConfigOption(command)));
  command.option('-d, --dry-run', 'Preview actions without deleting files');
  command.option('--action <action>', `Dedupe action (${Object.values(DedupeAction).join(', ')})`);
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
  const command = createOrganizeCommand(parent, handler);
  addAutoConfigOption(addLogLevelOption(addConfigOption(command)));
  command.option('-d, --dry-run', 'Preview changes without applying them');
  command.option('--no-manifest', 'Skip manifest generation');
  command.option('-o, --output <path>', 'Output directory for organized files');
  command.option('--dedupe', 'Enable duplicate detection before organization');
  command.option(
    '--dedupe-action <action>',
    `Duplicate action (${Object.values(DedupeAction).join(', ')})`
  );
}

/**
 * Registers the scan command on a parent command.
 * @param parent - Parent command.
 * @param handler - Scan handler.
 */
function registerScanCommand(parent: Readonly<Command>, handler: Readonly<IScanHandler>): void {
  addAutoConfigOption(addLogLevelOption(addConfigOption(createScanCommand(parent, handler))));
}
