import { createRootCommand } from './root-command';

describe('createRootCommand', () => {
  it('should register grouped top-level commands only', () => {
    const program = createRootCommand();
    const commandNames = program.commands.map(command => command.name());

    expect(commandNames).toContain('config');
    expect(commandNames).toContain('files');
    expect(commandNames).not.toContain('init');
    expect(commandNames).not.toContain('scan');
    expect(commandNames).not.toContain('organize');
    expect(commandNames).not.toContain('clean');
    expect(commandNames).not.toContain('dedupe');
  });

  it('should register grouped file subcommands', () => {
    const filesCommand = createRootCommand().commands.find(command => command.name() === 'files');
    const subcommandNames = filesCommand?.commands.map(command => command.name()) ?? [];

    expect(subcommandNames).toEqual(
      expect.arrayContaining(['scan', 'organize', 'clean', 'dedupe', 'revert', 'watch'])
    );
  });

  it('should register grouped config subcommands', () => {
    const configCommand = createRootCommand().commands.find(command => command.name() === 'config');
    const subcommandNames = configCommand?.commands.map(command => command.name()) ?? [];

    expect(subcommandNames).toEqual(expect.arrayContaining(['init', 'validate']));
  });
});
