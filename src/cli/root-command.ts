import { Command } from 'commander';

import { EmptyDirectoryCleaner } from '../cleaner';
import { DedupeReportWriter } from '../dedupe';

import { registerConfigCommandGroup, registerFilesCommandGroup } from './command-groups';
import { CleanHandler, DedupeHandler, InitHandler, OrganizeHandler, ScanHandler } from './commands';
import { CLI_CONSTANTS } from './constants';
import { ConfigService, DirectoryValidator, ManifestService } from './services';

/**
 * Creates the runtime commander program for the CLI.
 * @returns Configured commander program.
 */
export function createRootCommand(): Command {
  const program = new Command();
  const configService = new ConfigService();
  const directoryValidator = new DirectoryValidator();

  program.name('orderly').description(CLI_CONSTANTS.TOOL_DESCRIPTION).version('1.0.0');
  registerConfigCommandGroup(program, new InitHandler());
  registerFilesCommandGroup(program, {
    clean: new CleanHandler(new EmptyDirectoryCleaner(), configService, directoryValidator),
    dedupe: new DedupeHandler(configService, directoryValidator, new DedupeReportWriter()),
    organize: new OrganizeHandler(configService, directoryValidator, new ManifestService()),
    scan: new ScanHandler(configService, directoryValidator)
  });

  return program;
}
