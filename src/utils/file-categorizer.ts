import micromatch from 'micromatch';
import { CategoryRule } from '../config/types';

export class FileCategorizer {
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
