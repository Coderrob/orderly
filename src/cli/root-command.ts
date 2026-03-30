import { Command } from 'commander';

import { version } from '../../package.json';

import { registerConfigCommandGroup, registerFilesCommandGroup } from './command-groups';
import {
  createRootHandlers,
  createRootServices,
  createRootWorkflows,
  type IRootHandlers
} from './composition-root';
import { CLI_CONSTANTS } from './constants';

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
  const workflows = createRootWorkflows(services);
  const handlers = createRootHandlers(services, workflows);

  registerConfigCommands(program, handlers);
  registerFileCommands(program, handlers);
  return program;
}

/**
 * Registers grouped config commands.
 * @param program - Root commander program.
 * @param handlers - Root handlers.
 */
function registerConfigCommands(
  program: Readonly<Command>,
  handlers: Readonly<IRootHandlers>
): void {
  registerConfigCommandGroup(program, {
    init: handlers.init,
    validate: handlers.validate
  });
}

/**
 * Registers grouped file commands.
 * @param program - Root commander program.
 * @param handlers - Root handlers.
 */
function registerFileCommands(program: Readonly<Command>, handlers: Readonly<IRootHandlers>): void {
  registerFilesCommandGroup(program, {
    clean: handlers.clean,
    dedupe: handlers.dedupe,
    organize: handlers.organize,
    revert: handlers.revert,
    scan: handlers.scan,
    watch: handlers.watch
  });
}
