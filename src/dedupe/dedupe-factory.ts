import {
  DedupeService,
  DedupeMode,
  ExifStrategy,
  FileAttributesStrategy,
  FilePropertiesStrategy,
  ImageDimensionsStrategy,
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
   * @param strategyConfig - Optional per-strategy enablement and strategy-specific settings.
   * @returns The enabled strategy instances sorted by execution priority.
   */
  static createDefaultStrategies(strategyConfig?: IDedupeStrategyConfig): IDedupeStrategy[] {
    const strategies: IDedupeStrategy[] = [new NameStrategy(strategyConfig?.name)];

    this.pushIfEnabled(strategies, strategyConfig?.size, true, () => new SizeStrategy());
    this.pushIfEnabled(strategies, strategyConfig?.imageDimensions, false, () => {
      return new ImageDimensionsStrategy();
    });
    this.pushIfEnabled(strategies, strategyConfig?.exif, false, () => new ExifStrategy());
    this.pushIfEnabled(strategies, strategyConfig?.fileProperties, false, () => {
      return new FilePropertiesStrategy();
    });
    this.pushIfEnabled(strategies, strategyConfig?.fileAttributes, false, () => {
      return new FileAttributesStrategy();
    });
    this.pushIfEnabled(strategies, strategyConfig?.sha256, true, () => {
      return new Sha256Strategy(new Sha256Hasher());
    });

    return strategies.sort((left, right) => left.priority - right.priority);
  }

  /**
   * Creates a dedupe service with default strategies
   * @param config - Optional dedupe config containing runtime strategy composition settings.
   * @returns A dedupe service configured with the resolved default strategies and mode.
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

  /**
   * Resolves optional config booleans with explicit defaults.
   * @param value - Config value
   * @param defaultValue - Value used when config is undefined
   * @returns The explicit config value when provided; otherwise the supplied default.
   */
  private static isEnabled(value: boolean | undefined, defaultValue: boolean): boolean {
    return value ?? defaultValue;
  }

  /**
   * Adds a strategy only when the corresponding config flag resolves to enabled.
   * @param strategies - Mutable strategy collection being assembled.
   * @param value - Optional config flag controlling whether the strategy should be added.
   * @param defaultValue - Fallback enablement value when the config flag is undefined.
   * @param createStrategy - Factory callback that creates the strategy when enabled.
   */
  private static pushIfEnabled(
    strategies: IDedupeStrategy[],
    value: boolean | undefined,
    defaultValue: boolean,
    createStrategy: () => IDedupeStrategy
  ): void {
    if (this.isEnabled(value, defaultValue)) {
      strategies.push(createStrategy());
    }
  }
}
