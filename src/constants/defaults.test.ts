import {
  CONFIG_FILE_NAMES,
  DEFAULT_LOG_FILE,
  DEFAULT_MANIFEST_DIR,
  DEFAULT_MANIFEST_FILE,
  DEFAULT_MANIFEST_MD,
  DEFAULT_LOG_LEVEL,
  DEFAULT_DRY_RUN,
  DEFAULT_GENERATE_MANIFEST,
  DEFAULT_INCLUDE_HIDDEN,
  DEFAULT_NAMING_CONVENTION,
  MAX_FILENAME_LENGTH,
  RESERVED_NAMES
} from './defaults';

describe('Default Constants', () => {
  describe('CONFIG_FILE_NAMES', () => {
    it('should be a readonly tuple', () => {
      expect(Array.isArray(CONFIG_FILE_NAMES)).toBe(true);
    });

    it('should contain orderly config file names', () => {
      expect(CONFIG_FILE_NAMES).toContain('.orderly.yml');
      expect(CONFIG_FILE_NAMES).toContain('.orderly.yaml');
      expect(CONFIG_FILE_NAMES).toContain('orderly.config.json');
    });

    it('should have YAML files before JSON for precedence', () => {
      const yamlIndex = CONFIG_FILE_NAMES.indexOf('.orderly.yml');
      const jsonIndex = CONFIG_FILE_NAMES.indexOf('orderly.config.json');
      expect(yamlIndex).toBeLessThan(jsonIndex);
    });
  });

  describe('DEFAULT_LOG_FILE', () => {
    it('should be a string path', () => {
      expect(typeof DEFAULT_LOG_FILE).toBe('string');
    });

    it('should be in .orderly directory', () => {
      expect(DEFAULT_LOG_FILE).toContain('.orderly');
    });

    it('should end with .log', () => {
      expect(DEFAULT_LOG_FILE).toMatch(/\.log$/);
    });
  });

  describe('DEFAULT_MANIFEST_DIR', () => {
    it('should be .orderly directory', () => {
      expect(DEFAULT_MANIFEST_DIR).toBe('.orderly');
    });
  });

  describe('DEFAULT_MANIFEST_FILE', () => {
    it('should be manifest.json', () => {
      expect(DEFAULT_MANIFEST_FILE).toBe('manifest.json');
    });
  });

  describe('DEFAULT_MANIFEST_MD', () => {
    it('should be manifest.md', () => {
      expect(DEFAULT_MANIFEST_MD).toBe('manifest.md');
    });
  });

  describe('DEFAULT_LOG_LEVEL', () => {
    it('should be info', () => {
      expect(DEFAULT_LOG_LEVEL).toBe('info');
    });
  });

  describe('DEFAULT_DRY_RUN', () => {
    it('should be false', () => {
      expect(DEFAULT_DRY_RUN).toBe(false);
    });
  });

  describe('DEFAULT_GENERATE_MANIFEST', () => {
    it('should be false', () => {
      expect(DEFAULT_GENERATE_MANIFEST).toBe(false);
    });
  });

  describe('DEFAULT_INCLUDE_HIDDEN', () => {
    it('should be false', () => {
      expect(DEFAULT_INCLUDE_HIDDEN).toBe(false);
    });
  });

  describe('DEFAULT_NAMING_CONVENTION', () => {
    it('should be kebab-case', () => {
      expect(DEFAULT_NAMING_CONVENTION).toBe('kebab-case');
    });
  });

  describe('MAX_FILENAME_LENGTH', () => {
    it('should be 255', () => {
      expect(MAX_FILENAME_LENGTH).toBe(255);
    });
  });

  describe('RESERVED_NAMES', () => {
    it('should be a readonly array', () => {
      expect(Array.isArray(RESERVED_NAMES)).toBe(true);
    });

    it('should contain Windows reserved names', () => {
      expect(RESERVED_NAMES).toContain('CON');
      expect(RESERVED_NAMES).toContain('PRN');
      expect(RESERVED_NAMES).toContain('AUX');
      expect(RESERVED_NAMES).toContain('NUL');
    });

    it('should contain COM port names', () => {
      expect(RESERVED_NAMES).toContain('COM1');
      expect(RESERVED_NAMES).toContain('COM9');
    });

    it('should contain LPT port names', () => {
      expect(RESERVED_NAMES).toContain('LPT1');
      expect(RESERVED_NAMES).toContain('LPT9');
    });

    it('should have all names in uppercase', () => {
      RESERVED_NAMES.forEach(name => {
        expect(name).toBe(name.toUpperCase());
      });
    });
  });
});
