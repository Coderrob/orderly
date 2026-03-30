import type { IStrategyExecution } from './dedupe-analysis.helpers';
import { hasGroupableInput } from './dedupe-grouping-input';

describe('dedupe-grouping-input', () => {
  it('should return false for too few files', () => {
    expect(hasGroupableInput([{}], [createStrategyExecution()])).toBe(false);
  });

  it('should return false when no strategy executions are present', () => {
    expect(hasGroupableInput([{}, {}], [])).toBe(false);
  });

  it('should return true when enough files and strategy executions are present', () => {
    expect(hasGroupableInput([{}, {}], [createStrategyExecution()])).toBe(true);
  });
});

function createStrategyExecution(): IStrategyExecution {
  return {
    strategy: 'name',
    keysByPath: new Map([['/files/a.txt', 'dup']])
  };
}
