import {
  DedupeService,
  DedupeMode,
  NameStrategy,
  SizeStrategy,
  Sha256Strategy,
  Sha256Hasher,
  type IDedupeConfig,
  type IDedupeStrategy,
  type IDedupeStrategyConfig
} from '../dedupe';

/**
 * Factory for creating dedupe strategies.
 * Follows the Factory Pattern to encapsulate strategy creation logic.
 */
export class DedupeStrategyFactory {
  /**
   * Creates the default set of dedupe strategies
   */
  static createDefaultStrategies(strategyConfig?: IDedupeStrategyConfig): IDedupeStrategy[] {
    return [
      new SizeStrategy(),
      new NameStrategy(strategyConfig?.name),
      new Sha256Strategy(new Sha256Hasher())
    ].sort((left, right) => left.priority - right.priority);
  }

  /**
   * Creates a dedupe service with default strategies
   */
  static createDedupeService(config?: Pick<IDedupeConfig, 'strategy'>): DedupeService {
    const strategyConfig = this.getStrategyConfig(config?.strategy);
    return new DedupeService(
      this.createDefaultStrategies(strategyConfig),
      strategyConfig?.mode ?? DedupeMode.ANY
    );
  }

  /**
   * Normalizes runtime config so legacy string strategy values do not break dedupe construction.
   * @param strategy - Runtime strategy config value
   * @returns Parsed strategy config when present, otherwise undefined
   */
  private static getStrategyConfig(strategy: unknown): IDedupeStrategyConfig | undefined {
    if (strategy && typeof strategy === 'object' && 'mode' in strategy) {
      return strategy as IDedupeStrategyConfig;
    }

    return undefined;
  }
}
