describe('CLI entrypoint', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('./cli/root-command');
  });

  it('should create the root command and parse arguments', () => {
    const parse = jest.fn();
    const createRootCommand = jest.fn().mockReturnValue({ parse });

    jest.isolateModules(() => {
      jest.doMock('./cli/root-command', () => ({ createRootCommand }));
      require('./cli');
    });

    expect(createRootCommand).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
