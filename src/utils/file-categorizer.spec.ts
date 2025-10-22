import { FileCategorizer } from './file-categorizer';
import { CategoryRule } from '../config/types';

describe('FileCategorizer', () => {
  let testCategories: CategoryRule[];
  let testExtension: string;
  let testFilename: string;

  beforeEach(() => {
    testCategories = [
      {
        name: 'images',
        extensions: ['.jpg', '.png'],
        targetFolder: 'images'
      },
      {
        name: 'documents',
        extensions: ['.pdf', '.doc'],
        patterns: ['report-*'],
        targetFolder: 'documents'
      },
      {
        name: 'code',
        extensions: ['.ts', '.js'],
        targetFolder: 'code'
      }
    ];
    testExtension = '.jpg';
    testFilename = 'photo.jpg';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('categorize', () => {
    it.each([
      ['.jpg', 'photo.jpg', 'images'],
      ['.png', 'image.png', 'images'],
      ['.ts', 'file.ts', 'code'],
      ['.js', 'script.js', 'code']
    ])('should categorize %s file as %s', (ext, filename, expectedCategory) => {
      const result = FileCategorizer.categorize(ext, filename, testCategories);

      expect(result?.name).toBe(expectedCategory);
    });

    it('should return undefined for uncategorized extension', () => {
      const result = FileCategorizer.categorize('.xyz', 'file.xyz', testCategories);

      expect(result).toBeUndefined();
    });

    it('should match pattern when category has patterns', () => {
      const result = FileCategorizer.categorize('.pdf', 'report-2024.pdf', testCategories);

      expect(result?.name).toBe('documents');
    });

    it('should return undefined when extension matches but pattern does not', () => {
      const result = FileCategorizer.categorize('.pdf', 'invoice.pdf', testCategories);

      expect(result).toBeUndefined();
    });

    it('should match category without patterns', () => {
      const result = FileCategorizer.categorize('.jpg', 'any-photo.jpg', testCategories);

      expect(result?.name).toBe('images');
      expect(result?.targetFolder).toBe('images');
    });

    it('should return undefined when no categories provided', () => {
      const result = FileCategorizer.categorize('.jpg', 'photo.jpg', []);

      expect(result).toBeUndefined();
    });
  });
});
