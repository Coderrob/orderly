import type { ICleanResult } from '../../cleaner/interfaces';
import { ExitCode } from '../constants';

import { CleanHandler } from './clean.command';

describe('CleanHandler', () => {
  const createCleanResult = (overrides: Partial<ICleanResult> = {}): ICleanResult => ({
    scannedDirectories: 3,
    removedDirectories: 2,
    skippedDirectories: 1,
    removed: [
      { path: '/tmp/one', dryRun: false },
      { path: '/tmp/two', dryRun: false }
    ],
    errors: [],
    ...overrides
  });

  it('should validate the directory and return a success result', async () => {
    const directoryValidator = { validate: jest.fn().mockReturnValue('/tmp/root') };
    const cleanerService = { clean: jest.fn().mockReturnValue(createCleanResult()) };

    const result = await new CleanHandler(directoryValidator, cleanerService).execute('/input', {});

    expect(directoryValidator.validate).toHaveBeenCalledWith('/input');
    expect(cleanerService.clean).toHaveBeenCalledWith('/tmp/root', {});
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.message).toContain(
      'Removed 2 empty directories (scanned 3, skipped 1, errors 0)'
    );
  });

  it('should report dry-run results', async () => {
    const directoryValidator = { validate: jest.fn().mockReturnValue('/tmp/root') };
    const cleanerService = {
      clean: jest.fn().mockReturnValue(
        createCleanResult({
          removed: [{ path: '/tmp/one', dryRun: true }]
        })
      )
    };

    const result = await new CleanHandler(directoryValidator, cleanerService).execute('/input', {
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(
      'Dry run: 2 empty directories would be removed (scanned 3, skipped 1, errors 0)'
    );
  });

  it('should return a failure result when the cleaner reports errors', async () => {
    const directoryValidator = { validate: jest.fn().mockReturnValue('/tmp/root') };
    const cleanerService = {
      clean: jest.fn().mockReturnValue(
        createCleanResult({
          errors: [{ path: '/tmp/root/a', error: 'permission denied' }]
        })
      )
    };

    const result = await new CleanHandler(directoryValidator, cleanerService).execute('/input', {});

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(ExitCode.ERROR);
    expect(result.message).toContain(
      'Removed 2 empty directories (scanned 3, skipped 1, errors 1)'
    );
  });

  it('should report when no empty directories are found', async () => {
    const directoryValidator = { validate: jest.fn().mockReturnValue('/tmp/root') };
    const cleanerService = {
      clean: jest.fn().mockReturnValue(
        createCleanResult({
          removedDirectories: 0,
          removed: []
        })
      )
    };

    const result = await new CleanHandler(directoryValidator, cleanerService).execute('/input', {
      logLevel: 'invalid'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('No empty directories found');
  });

  it.each([
    ['debug', 'DEBUG'],
    ['info', 'INFO'],
    ['warn', 'WARN'],
    ['error', 'ERROR']
  ])('should accept the %s log level', async (logLevel: string) => {
    const directoryValidator = { validate: jest.fn().mockReturnValue('/tmp/root') };
    const cleanerService = { clean: jest.fn().mockReturnValue(createCleanResult()) };

    const result = await new CleanHandler(directoryValidator, cleanerService).execute('/input', {
      logLevel
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Removed 2 empty directories');
  });
});
