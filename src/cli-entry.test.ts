describe('CLI entrypoint', () => {
  it('should create the CLI service and parse arguments', () => {
    const parse = jest.fn();
    const CliService = jest.fn().mockImplementation(() => ({ parse }));

    jest.isolateModules(() => {
      jest.doMock('./cli/cli.service', () => ({ CliService }));
      require('./cli');
    });

    expect(CliService).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledTimes(1);
    jest.resetModules();
    jest.dontMock('./cli/cli.service');
  });
});
