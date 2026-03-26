import { Command } from 'commander';

import { version } from '../../package.json';
import { EmptyDirectoryCleaner } from '../cleaner';
import { DedupeReportWriter } from '../dedupe';

import { registerConfigCommandGroup, registerFilesCommandGroup } from './command-groups';
import {
  CleanHandler,
  ConfigValidateHandler,
  DedupeHandler,
  InitHandler,
  OrganizeHandler,
  RevertHandler,
  ScanHandler,
  WatchHandler
} from './commands';
import { CLI_CONSTANTS } from './constants';
import { ConfigService, DirectoryValidator, ManifestService } from './services';

interface IRootServices {
  readonly cleaner: EmptyDirectoryCleaner;
  readonly configService: ConfigService;
  readonly directoryValidator: DirectoryValidator;
  readonly manifestService: ManifestService;
}

/**
 * Creates the shared organize handler.
 * @param services - Root services.
 * @returns Organize handler.
 */
function createOrganizeHandler(services: Readonly<IRootServices>): OrganizeHandler {
  return new OrganizeHandler(
    services.configService,
    services.directoryValidator,
    services.manifestService,
    services.cleaner
  );
}

/**
 * Creates the root commander program.
 * @returns Program instance.
 */
function createProgram(): Command {
  return new Command().name('orderly').description(CLI_CONSTANTS.TOOL_DESCRIPTION).version(version);
}

/**
 * Creates the runtime commander program for the CLI.
 * @returns Configured commander program.
 */
export function createRootCommand(): Command {
  const program = createProgram();
  const services = createRootServices();
  const organizeHandler = createOrganizeHandler(services);

  registerConfigCommands(program, services.configService);
  registerFileCommands(program, services, organizeHandler);
  return program;
}

/**
 * Creates shared root services.
 * @returns Root services.
 */
function createRootServices(): Readonly<IRootServices> {
  return {
    cleaner: new EmptyDirectoryCleaner(),
    configService: new ConfigService(),
    directoryValidator: new DirectoryValidator(),
    manifestService: new ManifestService()
  };
}

/**
 * Registers grouped config commands.
 * @param program - Root commander program.
 * @param configService - Config service.
 */
function registerConfigCommands(
  program: Readonly<Command>,
  configService: Readonly<ConfigService>
): void {
  registerConfigCommandGroup(program, {
    init: new InitHandler(),
    validate: new ConfigValidateHandler(configService)
  });
}

/**
 * Registers grouped file commands.
 * @param program - Root commander program.
 * @param services - Root services.
 * @param organizeHandler - Shared organize handler.
 */
function registerFileCommands(
  program: Readonly<Command>,
  services: Readonly<IRootServices>,
  organizeHandler: Readonly<OrganizeHandler>
): void {
  registerFilesCommandGroup(program, {
    clean: new CleanHandler(services.cleaner, services.configService, services.directoryValidator),
    dedupe: new DedupeHandler(
      services.configService,
      services.directoryValidator,
      new DedupeReportWriter()
    ),
    organize: organizeHandler,
    revert: new RevertHandler(),
    scan: new ScanHandler(services.configService, services.directoryValidator),
    watch: new WatchHandler(organizeHandler)
  });
}
