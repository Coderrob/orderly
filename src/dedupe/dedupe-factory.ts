import {
  DedupeService,
  NameStrategy,
  SizeStrategy,
  Sha256Strategy,
  Sha256Hasher,
  type IDedupeStrategy
} from '../dedupe';

/**
 * Factory for creating dedupe strategies.
 * Follows the Factory Pattern to encapsulate strategy creation logic.
 */
export class DedupeStrategyFactory {
  /**
   * Creates the default set of dedupe strategies
   */
  static createDefaultStrategies(): IDedupeStrategy[] {
    return [new NameStrategy(), new SizeStrategy(), new Sha256Strategy(new Sha256Hasher())];
  }

  /**
   * Creates a dedupe service with default strategies
   */
  static createDedupeService(): DedupeService {
    return new DedupeService(this.createDefaultStrategies());
  }
}
