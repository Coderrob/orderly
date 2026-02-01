import {
  IMAGE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  CODE_EXTENSIONS,
  DEFAULT_CATEGORIES
} from './file-extensions';

describe('File Extension Constants', () => {
  describe('IMAGE_EXTENSIONS', () => {
    it('should be a readonly array', () => {
      expect(Array.isArray(IMAGE_EXTENSIONS)).toBe(true);
    });

    it('should contain common image extensions', () => {
      expect(IMAGE_EXTENSIONS).toContain('.jpg');
      expect(IMAGE_EXTENSIONS).toContain('.png');
      expect(IMAGE_EXTENSIONS).toContain('.gif');
      expect(IMAGE_EXTENSIONS).toContain('.svg');
      expect(IMAGE_EXTENSIONS).toContain('.webp');
    });

    it('should have extensions starting with dot', () => {
      IMAGE_EXTENSIONS.forEach(ext => {
        expect(ext.startsWith('.')).toBe(true);
      });
    });

    it('should be lowercase', () => {
      IMAGE_EXTENSIONS.forEach(ext => {
        expect(ext).toBe(ext.toLowerCase());
      });
    });
  });

  describe('DOCUMENT_EXTENSIONS', () => {
    it('should contain common document extensions', () => {
      expect(DOCUMENT_EXTENSIONS).toContain('.pdf');
      expect(DOCUMENT_EXTENSIONS).toContain('.doc');
      expect(DOCUMENT_EXTENSIONS).toContain('.txt');
      expect(DOCUMENT_EXTENSIONS).toContain('.md');
    });
  });

  describe('VIDEO_EXTENSIONS', () => {
    it('should contain common video extensions', () => {
      expect(VIDEO_EXTENSIONS).toContain('.mp4');
      expect(VIDEO_EXTENSIONS).toContain('.avi');
      expect(VIDEO_EXTENSIONS).toContain('.mkv');
    });
  });

  describe('AUDIO_EXTENSIONS', () => {
    it('should contain common audio extensions', () => {
      expect(AUDIO_EXTENSIONS).toContain('.mp3');
      expect(AUDIO_EXTENSIONS).toContain('.wav');
      expect(AUDIO_EXTENSIONS).toContain('.flac');
    });
  });

  describe('ARCHIVE_EXTENSIONS', () => {
    it('should contain common archive extensions', () => {
      expect(ARCHIVE_EXTENSIONS).toContain('.zip');
      expect(ARCHIVE_EXTENSIONS).toContain('.tar');
      expect(ARCHIVE_EXTENSIONS).toContain('.gz');
    });
  });

  describe('CODE_EXTENSIONS', () => {
    it('should contain common programming language extensions', () => {
      expect(CODE_EXTENSIONS).toContain('.js');
      expect(CODE_EXTENSIONS).toContain('.ts');
      expect(CODE_EXTENSIONS).toContain('.py');
      expect(CODE_EXTENSIONS).toContain('.java');
    });
  });

  describe('DEFAULT_CATEGORIES', () => {
    it('should be an array of IFileCategory objects', () => {
      expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true);
      DEFAULT_CATEGORIES.forEach(category => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('extensions');
        expect(category).toHaveProperty('targetFolder');
      });
    });

    it('should have 6 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(6);
    });

    it('should reference extension constants', () => {
      const imagesCategory = DEFAULT_CATEGORIES.find(c => c.name === 'images');
      expect(imagesCategory?.extensions).toBe(IMAGE_EXTENSIONS);
    });

    it('should have valid category names', () => {
      const categoryNames = DEFAULT_CATEGORIES.map(c => c.name);
      expect(categoryNames).toEqual(['images', 'documents', 'videos', 'audio', 'archives', 'code']);
    });
  });
});
