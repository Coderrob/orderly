import micromatch from 'micromatch';

import { type CategoryRule } from '../config/types';

export interface IFileCategorizer {
  categorize(
    extension: string,
    filename: string,
    categories: readonly CategoryRule[]
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
    categories: readonly CategoryRule[]
  ): CategoryRule | undefined {
    for (const category of categories) {
      if (this.hasCategoryMatch(extension, filename, category)) {
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
    categories: readonly CategoryRule[]
  ): CategoryRule | undefined {
    return FileCategorizer.categorize(extension, filename, categories);
  }

  /**
   * Checks if a file matches a specific category rule
   * @param extension - The file extension to match
   * @param filename - The complete filename for pattern matching
   * @param category - The category rule to check against
   * @returns True when the file matches the category rule; otherwise false
   */
  private static hasCategoryMatch(
    extension: string,
    filename: string,
    category: Readonly<CategoryRule>
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
