import { Command } from 'commander';

import { EmptyDirectoryCleaner } from '../cleaner/empty-directory-cleaner';

import {
  registerConfigCommandGroup,
  registerInitCommand
} from './command-groups/config.command-group';
import {
  registerCleanCommand,
  registerFilesCommandGroup,
  registerOrganizeCommand,
  registerScanCommand
} from './command-groups/files.command-group';
import { CleanHandler } from './commands/clean.command';
import { InitHandler } from './commands/init.command';
import { OrganizeHandler } from './commands/organize.command';
import { ScanHandler } from './commands/scan.command';
import { CLI_CONSTANTS } from './constants';
import type { ICleanHandler, IInitHandler, IOrganizeHandler, IScanHandler } from './interfaces';
import { ConfigService } from './services/config.service';
import { DirectoryValidator } from './services/directory-validator.service';
import { ManifestService } from './services/manifest.service';

/**
 * Dependencies required to build the runtime CLI tree.
 */
export interface IRootCommandDependencies {
  readonly cleanHandler: ICleanHandler;
  readonly initHandler: IInitHandler;
  readonly organizeHandler: IOrganizeHandler;
  readonly scanHandler: IScanHandler;
}

/**
 * Creates the default handler dependency graph for the runtime CLI.
 * @returns Default root command dependencies.
 */
function createDefaultDependencies(): IRootCommandDependencies {
  const configService = new ConfigService();
  const directoryValidator = new DirectoryValidator();
  const manifestService = new ManifestService();

  return {
    cleanHandler: new CleanHandler(directoryValidator, new EmptyDirectoryCleaner()),
    initHandler: new InitHandler(),
    organizeHandler: new OrganizeHandler(configService, directoryValidator, manifestService),
    scanHandler: new ScanHandler(configService, directoryValidator)
  };
}

/**
 * Creates the root CLI command.
 * @param dependencies - Optional command-handler dependencies.
 * @returns Configured root command.
 */
export function createRootCommand(
  dependencies: Readonly<IRootCommandDependencies> = createDefaultDependencies()
): Command {
  const rootCommand = new Command();

  rootCommand.name('orderly').description(CLI_CONSTANTS.TOOL_DESCRIPTION).version('1.0.0');

  registerFilesCommandGroup(rootCommand, dependencies);
  registerConfigCommandGroup(rootCommand, dependencies.initHandler);
  registerRootAliases(rootCommand, dependencies);

  return rootCommand;
}

/**
 * Registers temporary root-level aliases for the grouped commands.
 * @param rootCommand - Root command to augment.
 * @param dependencies - Runtime handlers.
 */
function registerRootAliases(
  rootCommand: Readonly<Command>,
  dependencies: Readonly<IRootCommandDependencies>
): void {
  registerScanCommand(rootCommand, dependencies.scanHandler);
  registerOrganizeCommand(rootCommand, dependencies.organizeHandler);
  registerInitCommand(rootCommand, dependencies.initHandler);
  registerCleanCommand(rootCommand, dependencies.cleanHandler);
}
