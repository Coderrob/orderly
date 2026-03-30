import * as orderly from './index';

describe('package root index exports', () => {
  it('should expose root cli entrypoints', () => {
    expect(orderly.createRootCommand).toBeDefined();
    expect(orderly.createRootHandlers).toBeDefined();
    expect(orderly.createRootServices).toBeDefined();
    expect(orderly.createRootWorkflows).toBeDefined();
  });

  it('should expose representative cli and domain modules', () => {
    expect(orderly.CleanHandler).toBeDefined();
    expect(orderly.DedupeWorkflow).toBeDefined();
    expect(orderly.EmptyDirectoryCleaner).toBeDefined();
    expect(orderly.ConfigLoader).toBeDefined();
    expect(orderly.DedupeService).toBeDefined();
    expect(orderly.FileOrganizer).toBeDefined();
    expect(orderly.FileScanner).toBeDefined();
    expect(orderly.Logger).toBeDefined();
    expect(orderly.Clock).toBeDefined();
  });

  it('should expose representative helper exports', () => {
    expect(orderly.registerFilesCommandGroup).toBeDefined();
    expect(orderly.resolveDedupeConfig).toBeDefined();
    expect(orderly.createCommandAction).toBeDefined();
    expect(orderly.DEFAULT_CONFIG).toBeDefined();
    expect(orderly.CONFIG_FILE_NAMES).toBeDefined();
    expect(orderly.DedupeAction).toBeDefined();
    expect(orderly.ErrorCode).toBeDefined();
    expect(orderly.LogLevel).toBeDefined();
    expect(orderly.OutputFormat).toBeDefined();
  });
});
