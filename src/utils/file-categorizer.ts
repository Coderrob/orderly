import micromatch from 'micromatch';

import { CategoryRule } from '../config/types';

export interface IFileCategorizer {
  categorize(
    extension: string,
    filename: string,
    categories: CategoryRule[]
  ): CategoryRule | undefined;
}

export class FileCategorizer implements IFileCategorizer {
  /**
   *
   * @param extension
   * @param filename
   * @param categories
   */
  static categorize(
    extension: string,
    filename: string,
    categories: CategoryRule[]
  ): CategoryRule | undefined {
    for (const category of categories) {
      if (this.matchesCategory(extension, filename, category)) {
        return category;
      }
    }
    return undefined;
  }

  /**
   *
   * @param extension
   * @param filename
   * @param categories
   */
  categorize(
    extension: string,
    filename: string,
    categories: CategoryRule[]
  ): CategoryRule | undefined {
    return FileCategorizer.categorize(extension, filename, categories);
  }

  /**
   *
   * @param extension
   * @param filename
   * @param category
   */
  private static matchesCategory(
    extension: string,
    filename: string,
    category: CategoryRule
  ): boolean {
    if (!category.extensions.includes(extension)) {
      return false;
    }

    if (category.patterns) {
      return micromatch.isMatch(filename, category.patterns);
    }

    return true;
  }
}
