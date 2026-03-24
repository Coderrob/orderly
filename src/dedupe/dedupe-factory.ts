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

interface IStrategyToggle {
  readonly configured?: boolean;
  readonly enabledWhenMissing: boolean;
}

interface IOptionalStrategyDefinition {
  readonly toggle: Readonly<IStrategyToggle>;
  readonly strategy: Readonly<IDedupeStrategy>;
}

/**
 * Type guard for runtime dedupe strategy config objects.
 * @param strategy - Runtime strategy config value.
 * @returns True when the value is a dedupe strategy config.
 */
function isDedupeStrategyConfig(strategy: unknown): strategy is IDedupeStrategyConfig {
  return !!strategy && typeof strategy === 'object' && 'mode' in strategy;
}

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
  static createDefaultStrategies(
    strategyConfig?: Readonly<IDedupeStrategyConfig>
  ): IDedupeStrategy[] {
    const strategies: readonly IDedupeStrategy[] = [
      new NameStrategy(strategyConfig?.name),
      ...this.getOptionalStrategies(strategyConfig)
    ];
    return this.sortStrategiesByPriority(strategies);
  }

  /**
   * Creates a dedupe service with default strategies
   * @param config - Optional dedupe config containing runtime strategy composition settings.
   * @returns A dedupe service configured with the resolved default strategies and mode.
   */
  static createDedupeService(config?: Readonly<Pick<IDedupeConfig, 'strategy'>>): DedupeService {
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
    return isDedupeStrategyConfig(strategy) ? strategy : undefined;
  }

  /**
   * Returns optional strategies enabled by config toggles.
   * @param strategyConfig - Optional strategy configuration.
   * @returns Enabled optional strategies.
   */
  private static getOptionalStrategies(
    strategyConfig?: Readonly<IDedupeStrategyConfig>
  ): readonly IDedupeStrategy[] {
    return this.resolveOptionalStrategies(this.getOptionalStrategyDefinitions(strategyConfig));
  }

  /**
   * Builds optional strategy definitions from config.
   * @param strategyConfig - Optional strategy configuration.
   * @returns Strategy definitions with toggles.
   */
  private static getOptionalStrategyDefinitions(
    strategyConfig?: Readonly<IDedupeStrategyConfig>
  ): readonly IOptionalStrategyDefinition[] {
    return [
      ...this.getDefaultEnabledStrategyDefinitions(strategyConfig),
      ...this.getDefaultDisabledStrategyDefinitions(strategyConfig)
    ];
  }

  /**
   * Builds definitions for strategies enabled by default.
   * @param strategyConfig - Optional strategy configuration.
   * @returns Strategy definitions enabled unless explicitly disabled.
   */
  private static getDefaultEnabledStrategyDefinitions(
    strategyConfig?: Readonly<IDedupeStrategyConfig>
  ): readonly IOptionalStrategyDefinition[] {
    return [
      this.createDefaultEnabledStrategyDefinition(strategyConfig?.size, new SizeStrategy()),
      this.createDefaultEnabledStrategyDefinition(
        strategyConfig?.sha256,
        new Sha256Strategy(new Sha256Hasher())
      )
    ];
  }

  /**
   * Builds definitions for strategies disabled by default.
   * @param strategyConfig - Optional strategy configuration.
   * @returns Strategy definitions enabled only when explicitly configured.
   */
  private static getDefaultDisabledStrategyDefinitions(
    strategyConfig?: Readonly<IDedupeStrategyConfig>
  ): readonly IOptionalStrategyDefinition[] {
    return [
      this.createDefaultDisabledStrategyDefinition(
        strategyConfig?.imageDimensions,
        new ImageDimensionsStrategy()
      ),
      this.createDefaultDisabledStrategyDefinition(strategyConfig?.exif, new ExifStrategy()),
      this.createDefaultDisabledStrategyDefinition(
        strategyConfig?.fileProperties,
        new FilePropertiesStrategy()
      ),
      this.createDefaultDisabledStrategyDefinition(
        strategyConfig?.fileAttributes,
        new FileAttributesStrategy()
      )
    ];
  }

  /**
   * Creates one optional strategy definition for default-enabled strategies.
   * @param configured - Explicit toggle value.
   * @param strategy - Strategy to include.
   * @returns Optional strategy definition.
   */
  private static createDefaultEnabledStrategyDefinition(
    configured: boolean | undefined,
    strategy: Readonly<IDedupeStrategy>
  ): Readonly<IOptionalStrategyDefinition> {
    return {
      toggle: { configured, enabledWhenMissing: true },
      strategy
    };
  }

  /**
   * Creates one optional strategy definition for default-disabled strategies.
   * @param configured - Explicit toggle value.
   * @param strategy - Strategy to include.
   * @returns Optional strategy definition.
   */
  private static createDefaultDisabledStrategyDefinition(
    configured: boolean | undefined,
    strategy: Readonly<IDedupeStrategy>
  ): Readonly<IOptionalStrategyDefinition> {
    return {
      toggle: { configured, enabledWhenMissing: false },
      strategy
    };
  }

  /**
   * Resolves all optional strategies from their definitions.
   * @param definitions - Strategy definitions.
   * @returns Enabled strategies.
   */
  private static resolveOptionalStrategies(
    definitions: readonly Readonly<IOptionalStrategyDefinition>[]
  ): readonly IDedupeStrategy[] {
    if (definitions.length === 0) {
      return [];
    }

    const [firstDefinition, ...remainingDefinitions] = definitions;

    return [
      ...this.resolveOptionalStrategy(firstDefinition.toggle, firstDefinition.strategy),
      ...this.resolveOptionalStrategies(remainingDefinitions)
    ];
  }

  /**
   * Returns a strategy array containing a single strategy when enabled.
   * @param toggle - Toggle inputs.
   * @param strategy - Strategy to include when enabled.
   * @returns Single-item strategy array or empty array.
   */
  private static resolveOptionalStrategy(
    toggle: Readonly<IStrategyToggle>,
    strategy: Readonly<IDedupeStrategy>
  ): readonly IDedupeStrategy[] {
    return this.isStrategyEnabled(toggle) ? [strategy] : [];
  }

  /**
   * Returns strategies ordered by ascending priority without mutating inputs.
   * @param strategies - Strategy collection.
   * @returns Sorted strategy array.
   */
  private static sortStrategiesByPriority(
    strategies: readonly IDedupeStrategy[]
  ): IDedupeStrategy[] {
    let sortedStrategies: readonly IDedupeStrategy[] = [];
    for (const strategy of strategies) {
      sortedStrategies = this.insertStrategyByPriority(sortedStrategies, strategy);
    }
    return [...sortedStrategies];
  }

  /**
   * Inserts a strategy into an already sorted list while keeping order.
   * @param sortedStrategies - Existing sorted strategies.
   * @param strategy - Strategy to insert.
   * @returns New sorted strategies with inserted item.
   */
  private static insertStrategyByPriority(
    sortedStrategies: readonly IDedupeStrategy[],
    strategy: Readonly<IDedupeStrategy>
  ): readonly IDedupeStrategy[] {
    let insertIndex = -1;
    for (const [index, existing] of sortedStrategies.entries()) {
      if (existing.priority > strategy.priority) {
        insertIndex = index;
        break;
      }
    }

    return insertIndex === -1
      ? [...sortedStrategies, strategy]
      : [
          ...sortedStrategies.slice(0, insertIndex),
          strategy,
          ...sortedStrategies.slice(insertIndex)
        ];
  }

  /**
   * Resolves optional config booleans with explicit defaults.
   * @param toggle - Toggle inputs.
   * @returns True when strategy should be enabled.
   */
  private static isStrategyEnabled(toggle: Readonly<IStrategyToggle>): boolean {
    return toggle.configured ?? toggle.enabledWhenMissing;
  }
}
