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
   * Categorizes a file based on its extension and name against configured rules
   * @param extension - The file extension to match against category rules
   * @param filename - The complete filename for pattern matching
   * @param categories - Array of category rules to check against
   * @returns The matching CategoryRule if found, undefined if no match
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
   * Instance method that categorizes a file based on extension and name
   * @param extension - The file extension to match against category rules
   * @param filename - The complete filename for pattern matching
   * @param categories - Array of category rules to check against
   * @returns The matching CategoryRule if found, undefined if no match
   */
  categorize(
    extension: string,
    filename: string,
    categories: CategoryRule[]
  ): CategoryRule | undefined {
    return FileCategorizer.categorize(extension, filename, categories);
  }

  /**
   * Checks if a file matches a specific category rule
   * @param extension - The file extension to match
   * @param filename - The complete filename for pattern matching
   * @param category - The category rule to check against
   * @returns True if file matches the category rule, false otherwise
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
