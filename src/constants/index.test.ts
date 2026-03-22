import * as constants from './index';

describe('constants index exports', () => {
  it('should expose default configuration constants and extension groups', () => {
    expect(constants.CONFIG_FILE_NAMES).toBeDefined();
    expect(constants.DEFAULT_DRY_RUN).toBeDefined();
    expect(constants.DEFAULT_GENERATE_MANIFEST).toBeDefined();
    expect(constants.DEFAULT_INCLUDE_HIDDEN).toBeDefined();
    expect(constants.DEFAULT_LOG_FILE).toBeDefined();
    expect(constants.DEFAULT_LOG_LEVEL).toBeDefined();
    expect(constants.DEFAULT_MANIFEST_DIR).toBeDefined();
    expect(constants.DEFAULT_MANIFEST_FILE).toBeDefined();
    expect(constants.DEFAULT_MANIFEST_MD).toBeDefined();
    expect(constants.DEFAULT_NAMING_CONVENTION).toBeDefined();
    expect(constants.MAX_FILENAME_LENGTH).toBeDefined();
    expect(constants.RESERVED_NAMES).toBeDefined();
    expect(constants.ARCHIVE_EXTENSIONS).toBeDefined();
    expect(constants.AUDIO_EXTENSIONS).toBeDefined();
    expect(constants.CODE_EXTENSIONS).toBeDefined();
    expect(constants.DEFAULT_CATEGORIES).toBeDefined();
    expect(constants.DOCUMENT_EXTENSIONS).toBeDefined();
    expect(constants.IMAGE_EXTENSIONS).toBeDefined();
    expect(constants.VIDEO_EXTENSIONS).toBeDefined();
  });
});
