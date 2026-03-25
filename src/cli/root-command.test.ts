import { createRootCommand } from './root-command';

describe('createRootCommand', () => {
  it('should register grouped commands and root aliases', () => {
    const dependencies = {
      cleanHandler: { execute: jest.fn() },
      initHandler: { execute: jest.fn() },
      organizeHandler: { execute: jest.fn() },
      scanHandler: { execute: jest.fn() }
    };

    const rootCommand = createRootCommand(dependencies);
    const rootCommandNames = rootCommand.commands.map(command => command.name());
    const filesCommand = rootCommand.commands.find(command => command.name() === 'files');
    const configCommand = rootCommand.commands.find(command => command.name() === 'config');

    expect(rootCommandNames).toContain('files');
    expect(rootCommandNames).toContain('config');
    expect(rootCommandNames).toContain('scan');
    expect(rootCommandNames).toContain('organize');
    expect(rootCommandNames).toContain('init');
    expect(rootCommandNames).toContain('clean');
    expect(filesCommand?.commands.map(command => command.name())).toEqual(
      expect.arrayContaining(['scan', 'organize', 'clean'])
    );
    expect(configCommand?.commands.map(command => command.name())).toEqual(['init']);
  });

  it('should create the runtime command tree when dependencies are omitted', () => {
    const rootCommand = createRootCommand();

    expect(rootCommand.name()).toBe('orderly');
    expect(rootCommand.commands.map(command => command.name())).toEqual(
      expect.arrayContaining(['files', 'config', 'scan', 'organize', 'init', 'clean'])
    );
  });
});
