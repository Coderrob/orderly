import * as decorators from './index';

describe('cli decorators index exports', () => {
  it('should expose all public decorator entrypoints', () => {
    expect(decorators.WithAutoConfigDiscovery).toBeDefined();
    expect(decorators.WithCliAutoConfigDiscovery).toBeDefined();
    expect(decorators.createAuditCommandWrapper).toBeDefined();
    expect(decorators.WithCommandAudit).toBeDefined();
    expect(decorators.WithCommandTelemetry).toBeDefined();
    expect(decorators.HandleCliActionErrors).toBeDefined();
    expect(decorators.HandleCommandErrors).toBeDefined();
  });

  it('should expose shared command-decorator helpers', () => {
    expect(decorators.createCliActionMethodDecorator).toBeDefined();
    expect(decorators.createMethodDecorator).toBeDefined();
    expect(decorators.createWrappedCliActionDescriptor).toBeDefined();
    expect(decorators.createWrappedCliActionMethodDecorator).toBeDefined();
    expect(decorators.createCommandMiddlewareDecorator).toBeDefined();
    expect(decorators.createCommandMiddlewareWrapper).toBeDefined();
    expect(decorators.createWrappedMethodDecorator).toBeDefined();
    expect(decorators.createWrappedMethodDescriptor).toBeDefined();
    expect(decorators.createCommandMethodDecorator).toBeDefined();
    expect(decorators.createWrappedCommandMethodDecorator).toBeDefined();
    expect(decorators.createWrappedDescriptor).toBeDefined();
    expect(decorators.createErrorHandledCommandWrapper).toBeDefined();
    expect(decorators.createTelemetryCommandWrapper).toBeDefined();
    expect(decorators.invokeCliAction).toBeDefined();
    expect(decorators.invokeMethod).toBeDefined();
    expect(decorators.invokeCommand).toBeDefined();
    expect(decorators.isCliActionExecution).toBeDefined();
    expect(decorators.isCommandExecution).toBeDefined();
    expect(decorators.isCommandResult).toBeDefined();
  });
});
