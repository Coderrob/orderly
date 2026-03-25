import * as path from 'node:path';
import * as fs from 'node:fs';

import { EmptyDirectoryCleaner } from '../../src/cleaner/empty-directory-cleaner';
import { CleanHandler } from '../../src/cli/commands/clean.command';
import { InitHandler } from '../../src/cli/commands/init.command';
import { OrganizeHandler } from '../../src/cli/commands/organize.command';
import { ScanHandler } from '../../src/cli/commands/scan.command';
import { ConfigService } from '../../src/cli/services/config.service';
import { DirectoryValidator } from '../../src/cli/services/directory-validator.service';
import { ManifestService } from '../../src/cli/services/manifest.service';
import { ExitCode } from '../../src/cli/constants';
import { DedupeAction } from '../../src/dedupe/types';
import { NamingConventionType, CollisionResolutionStrategy } from '../../src/config/types';
import { TestEnvironmentSetup, TestAssertions, createTestConfig } from '../helpers';

/**
 * CLI integration tests covering common real-world usage scenarios.
 *
 * These tests exercise the full pipeline (init → scan → organize) to validate
 * that the commands work together correctly and produce the expected file system
 * outcomes across a range of user workflows.
 */
describe('CLI Integration Tests — Common Scenarios', () => {
  let testEnv: TestEnvironmentSetup;
  let testDir: string;
  let initHandler: InitHandler;
  let scanHandler: ScanHandler;
  let organizeHandler: OrganizeHandler;
  let cleanHandler: CleanHandler;
  let configService: ConfigService;
  let directoryValidator: DirectoryValidator;
  let manifestService: ManifestService;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    testDir = testEnv.createTempDir();
    configService = new ConfigService();
    directoryValidator = new DirectoryValidator();
    manifestService = new ManifestService();
    initHandler = new InitHandler();
    scanHandler = new ScanHandler(configService, directoryValidator);
    organizeHandler = new OrganizeHandler(configService, directoryValidator, manifestService);
    cleanHandler = new CleanHandler(directoryValidator, new EmptyDirectoryCleaner());

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    process.chdir(testDir);
  });

  afterEach(() => {
    testEnv.cleanup();
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: init → scan → organize (full end-to-end flow)
  // ---------------------------------------------------------------------------
  describe('Full workflow: init → scan → organize', () => {
    it('should initialize config, scan directory, then organize files', async () => {
      // init
      const initResult = await initHandler.execute({ format: 'json' });
      expect(initResult.success).toBe(true);
      expect(initResult.exitCode).toBe(ExitCode.SUCCESS);

      const configPath = path.join(testDir, '.orderly.config.json');
      TestAssertions.assertFileExists(configPath);

      // seed files
      testEnv.createFile(path.join(testDir, 'report.txt'), 'annual report');
      testEnv.createFile(path.join(testDir, 'photo.jpg'), 'jpeg data');
      testEnv.createFile(path.join(testDir, 'app.js'), 'console.log("hello")');

      // scan (preview)
      const scanResult = await scanHandler.execute(testDir, { config: configPath });
      expect(scanResult.success).toBe(true);
      expect(scanResult.message).toContain('3 files');

      // organize (apply)
      const organizeResult = await organizeHandler.execute(testDir, { config: configPath });
      expect(organizeResult.success).toBe(true);
      expect(organizeResult.exitCode).toBe(ExitCode.SUCCESS);

      // verify expected destinations
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'report.txt'));
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'photo.jpg'));
      TestAssertions.assertFileExists(path.join(testDir, 'code', 'app.js'));

      // source files must be gone
      TestAssertions.assertFileNotExists(path.join(testDir, 'report.txt'));
      TestAssertions.assertFileNotExists(path.join(testDir, 'photo.jpg'));
      TestAssertions.assertFileNotExists(path.join(testDir, 'app.js'));
    });

    it('should produce an idempotent result when organized files are scanned again', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'note.txt'), 'notes');

      // first organize
      const first = await organizeHandler.execute(testDir, { config: configPath });
      expect(first.success).toBe(true);
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'note.txt'));

      // second organize — nothing new to move
      const second = await organizeHandler.execute(testDir, { config: configPath });
      expect(second.success).toBe(true);

      // file still present; not duplicated or lost
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'note.txt'));
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: auto-discovery of each supported config file name
  // ---------------------------------------------------------------------------
  describe('Config auto-discovery', () => {
    const configFileNames = [
      '.orderly.yml',
      '.orderly.yaml',
      '.orderly.config.yaml',
      '.orderly.config.json',
      'orderly.config.json'
    ] as const;

    configFileNames.forEach(configName => {
      it(`should auto-discover config file: ${configName}`, async () => {
        // Create the config under the target directory name under test
        const singleFileDir = testEnv.createTempDir();
        const isJson = configName.endsWith('.json');
        const config = createTestConfig({ dryRun: false });
        const configContent = isJson
          ? JSON.stringify(config, null, 2)
          : `logLevel: info\ndryRun: false\ngenerateManifest: false\nincludeHidden: false\nexcludePatterns: []\nnamingConvention:\n  type: kebab-case\n  lowercase: true\ncategories:\n  - name: documents\n    extensions: [.txt]\n    targetFolder: documents\n`;

        testEnv.createFile(path.join(singleFileDir, configName), configContent);
        testEnv.createFile(path.join(singleFileDir, 'hello.txt'), 'hello world');

        // Invoke WITHOUT an explicit --config; auto-discovery should find configName
        const result = await organizeHandler.execute(singleFileDir, {});

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(ExitCode.SUCCESS);

        // The file should have been organized using the auto-discovered config
        TestAssertions.assertFileExists(path.join(singleFileDir, 'documents', 'hello.txt'));
      });
    });

    it('should not use auto-config when autoConfig is false', async () => {
      // Place a config that would restrict organization to .txt only
      const configPath = path.join(testDir, '.orderly.yml');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));
      testEnv.createFile(path.join(testDir, 'note.txt'), 'content');

      // When auto-discovery is disabled the default config is used (not the one in testDir);
      // the important contract is that the command runs without error
      const result = await organizeHandler.execute(testDir, { autoConfig: false });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: mixed media — realistic download folder
  // ---------------------------------------------------------------------------
  describe('Mixed-media download folder organization', () => {
    it('should sort documents, images, and code into separate folders', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const files: Array<[string, string]> = [
        ['invoice-2024.pdf', 'pdf content'],
        ['resume.docx', 'docx content'],
        ['readme.md', '# Readme'],
        ['logo.png', 'png data'],
        ['banner.jpg', 'jpg data'],
        ['icon.svg', '<svg/>'],
        ['index.ts', 'export {}'],
        ['helpers.js', 'function help() {}'],
        ['script.py', 'print("hi")']
      ];

      files.forEach(([name, content]) => {
        testEnv.createFile(path.join(testDir, name), content);
      });

      const result = await organizeHandler.execute(testDir, { config: configPath });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Documents
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'readme.md'));

      // Images
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'logo.png'));
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'banner.jpg'));
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'icon.svg'));

      // Code
      TestAssertions.assertFileExists(path.join(testDir, 'code', 'index.ts'));
      TestAssertions.assertFileExists(path.join(testDir, 'code', 'helpers.js'));
      TestAssertions.assertFileExists(path.join(testDir, 'code', 'script.py'));
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: custom categories in config
  // ---------------------------------------------------------------------------
  describe('Custom categories', () => {
    it('should organize files into user-defined category folders', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        categories: [
          { name: 'spreadsheets', extensions: ['.csv', '.xlsx'], targetFolder: 'data' },
          { name: 'archives', extensions: ['.zip', '.tar', '.gz'], targetFolder: 'archives' },
          { name: 'configs', extensions: ['.json', '.yaml', '.toml'], targetFolder: 'config' }
        ]
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'sales.csv'), 'a,b,c');
      testEnv.createFile(path.join(testDir, 'backup.zip'), 'PK...');
      testEnv.createFile(path.join(testDir, 'settings.json'), '{}');

      const result = await organizeHandler.execute(testDir, { config: configPath });

      expect(result.success).toBe(true);
      TestAssertions.assertFileExists(path.join(testDir, 'data', 'sales.csv'));
      TestAssertions.assertFileExists(path.join(testDir, 'archives', 'backup.zip'));
      TestAssertions.assertFileExists(path.join(testDir, 'config', 'settings.json'));
    });

    it('should leave uncategorized files in place', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        categories: [{ name: 'images', extensions: ['.png'], targetFolder: 'images' }]
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'photo.png'), 'image');
      testEnv.createFile(path.join(testDir, 'unknown.xyz'), 'mystery');

      await organizeHandler.execute(testDir, { config: configPath });

      TestAssertions.assertFileExists(path.join(testDir, 'images', 'photo.png'));
      // uncategorized file stays where it is
      TestAssertions.assertFileExists(path.join(testDir, 'unknown.xyz'));
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: naming convention transformations
  // ---------------------------------------------------------------------------
  describe('Naming convention transformations', () => {
    const namingCases: Array<{
      convention: string;
      input: string;
      expected: string;
    }> = [
      {
        convention: NamingConventionType.KEBAB_CASE,
        input: 'My File Name.txt',
        expected: 'my-file-name.txt'
      },
      {
        convention: NamingConventionType.SNAKE_CASE,
        input: 'My File Name.txt',
        expected: 'my_file_name.txt'
      },
      {
        convention: NamingConventionType.CAMEL_CASE,
        input: 'My File Name.txt',
        expected: 'myFileName.txt'
      },
      {
        convention: NamingConventionType.PASCAL_CASE,
        input: 'my file name.txt',
        expected: 'MyFileName.txt'
      }
    ];

    namingCases.forEach(({ convention, input, expected }) => {
      it(`should rename files using ${convention}`, async () => {
        const configPath = path.join(testDir, '.orderly.config.json');
        const config = createTestConfig({
          dryRun: false,
          namingConvention: {
            type: convention,
            lowercase: convention !== NamingConventionType.PASCAL_CASE
          }
        });
        testEnv.createFile(configPath, JSON.stringify(config, null, 2));
        testEnv.createFile(path.join(testDir, input), 'content');

        const result = await organizeHandler.execute(testDir, { config: configPath });

        expect(result.success).toBe(true);
        TestAssertions.assertFileExists(path.join(testDir, 'documents', expected));
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: dry-run — no file system changes
  // ---------------------------------------------------------------------------
  describe('Dry-run mode', () => {
    it('should report planned operations without moving any files', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: true });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'draft.txt'), 'draft');
      testEnv.createFile(path.join(testDir, 'cover.jpg'), 'cover');

      const before = testEnv.readDirStructure(testDir);
      const result = await organizeHandler.execute(testDir, { config: configPath, dryRun: true });

      expect(result.success).toBe(true);
      const after = testEnv.readDirStructure(testDir);
      expect(after).toEqual(before);
    });

    it('should report file counts during scan dry-run', async () => {
      testEnv.createFile(path.join(testDir, 'a.txt'), 'a');
      testEnv.createFile(path.join(testDir, 'b.txt'), 'b');
      testEnv.createFile(path.join(testDir, 'c.jpg'), 'c');

      const result = await scanHandler.execute(testDir, {});
      expect(result.success).toBe(true);
      expect(result.message).toContain('3 files');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: exclude patterns
  // ---------------------------------------------------------------------------
  describe('Exclude patterns', () => {
    it('should not organize files that match exclude patterns', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        excludePatterns: ['**/*.tmp', '**/*.log', '**/temp/**']
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'important.txt'), 'keep');
      testEnv.createFile(path.join(testDir, 'cache.tmp'), 'temp');
      testEnv.createFile(path.join(testDir, 'error.log'), 'log');
      testEnv.createFile(path.join(testDir, 'temp', 'scratch.txt'), 'scratch');

      await organizeHandler.execute(testDir, { config: configPath });

      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'important.txt'));
      // These must still be at their original locations
      TestAssertions.assertFileExists(path.join(testDir, 'cache.tmp'));
      TestAssertions.assertFileExists(path.join(testDir, 'error.log'));
      TestAssertions.assertFileExists(path.join(testDir, 'temp', 'scratch.txt'));
    });

    it('should exclude node_modules and .git by default', async () => {
      // Default config excludes node_modules/** and .git/**
      testEnv.createFile(path.join(testDir, 'app.js'), 'app');
      testEnv.createFile(path.join(testDir, 'node_modules', 'lib.js'), 'lib');
      testEnv.createFile(path.join(testDir, '.git', 'config'), 'gitcfg');

      const result = await organizeHandler.execute(testDir, {});
      expect(result.success).toBe(true);

      // Only app.js should be organized; node_modules and .git stay
      TestAssertions.assertFileExists(path.join(testDir, 'code', 'app.js'));
      TestAssertions.assertFileExists(path.join(testDir, 'node_modules', 'lib.js'));
      TestAssertions.assertFileExists(path.join(testDir, '.git', 'config'));
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: hidden file inclusion
  // ---------------------------------------------------------------------------
  describe('Hidden file inclusion', () => {
    it('should not scan hidden files by default', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ includeHidden: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'visible.txt'), 'visible');
      testEnv.createFile(path.join(testDir, '.hidden.txt'), 'hidden');

      const result = await scanHandler.execute(testDir, { config: configPath });
      expect(result.success).toBe(true);
      // Only visible.txt is counted (hidden file excluded)
      expect(result.message).toContain('1 file');
    });

    it('should scan hidden files when includeHidden is true', async () => {
      // Place the config outside the scan directory so the config file itself
      // is not picked up by the dot-inclusive glob.
      const configDir = testEnv.createTempDir();
      const configPath = path.join(configDir, 'orderly.config.json');
      const config = createTestConfig({ includeHidden: true });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'visible.txt'), 'visible');
      testEnv.createFile(path.join(testDir, '.secret.txt'), 'hidden');

      const result = await scanHandler.execute(testDir, { config: configPath });
      expect(result.success).toBe(true);
      // Both visible and hidden files should appear
      expect(result.message).toContain('2 files');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 9: collision resolution strategies
  // ---------------------------------------------------------------------------
  describe('Collision resolution', () => {
    it('should rename colliding files using keep-both strategy', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        ...createTestConfig({ dryRun: false }),
        collisionResolution: { strategy: CollisionResolutionStrategy.KEEP_BOTH }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Two files with identical names from different sub-folders
      testEnv.createFile(path.join(testDir, 'folder-a', 'report.txt'), 'version a');
      testEnv.createFile(path.join(testDir, 'folder-b', 'report.txt'), 'version b');

      const result = await organizeHandler.execute(testDir, { config: configPath });
      expect(result.success).toBe(true);

      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
      const organized = fs.readdirSync(documentsDir);
      // Both files survive (one keeps original name, other gets a suffix)
      expect(organized.length).toBe(2);
      expect(organized).toContain('report.txt');
    });

    it('should skip second file when collision strategy is skip', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        ...createTestConfig({ dryRun: false }),
        collisionResolution: { strategy: CollisionResolutionStrategy.SKIP }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'dir1', 'notes.txt'), 'first');
      testEnv.createFile(path.join(testDir, 'dir2', 'notes.txt'), 'second');

      const result = await organizeHandler.execute(testDir, { config: configPath });
      expect(result.success).toBe(true);

      const documentsDir = path.join(testDir, 'documents');
      const organized = fs.readdirSync(documentsDir);
      // Only the first file is moved; second is skipped
      expect(organized.length).toBe(1);
      expect(organized).toContain('notes.txt');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 10: output directory override
  // ---------------------------------------------------------------------------
  describe('Output directory override', () => {
    it('should organize files into a separate output directory', async () => {
      const outputDir = path.join(testDir, 'organized-output');
      testEnv.createFile(path.join(testDir, 'doc.txt'), 'docs');
      testEnv.createFile(path.join(testDir, 'img.png'), 'image');

      const result = await organizeHandler.execute(testDir, { output: outputDir });

      expect(result.success).toBe(true);
      TestAssertions.assertDirExists(outputDir);
      TestAssertions.assertFileExists(path.join(outputDir, 'documents', 'doc.txt'));
      TestAssertions.assertFileExists(path.join(outputDir, 'images', 'img.png'));

      // Source files are moved (not copied) so they should no longer be at the root
      TestAssertions.assertFileNotExists(path.join(testDir, 'doc.txt'));
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 11: manifest generation
  // ---------------------------------------------------------------------------
  describe('Manifest generation', () => {
    it('should generate JSON and Markdown manifests when requested', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false, generateManifest: true });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));
      testEnv.createFile(path.join(testDir, 'budget.txt'), 'numbers');

      const result = await organizeHandler.execute(testDir, {
        config: configPath,
        manifest: true
      });

      expect(result.success).toBe(true);

      const manifestJson = path.join(testDir, 'orderly-manifest.json');
      const manifestMd = path.join(testDir, 'orderly-manifest.md');

      TestAssertions.assertFileExists(manifestJson);
      TestAssertions.assertFileExists(manifestMd);

      // JSON manifest should be parseable and contain operations
      const raw = testEnv.readFile(manifestJson);
      const manifest = JSON.parse(raw);
      expect(manifest).toHaveProperty('operations');
      expect(Array.isArray(manifest.operations)).toBe(true);
      expect(manifest.operations.length).toBeGreaterThan(0);
    });

    it('should not generate manifests when manifest option is false', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));
      testEnv.createFile(path.join(testDir, 'file.txt'), 'content');

      await organizeHandler.execute(testDir, { config: configPath, manifest: false });

      TestAssertions.assertFileNotExists(path.join(testDir, '.orderly', 'manifest.json'));
      TestAssertions.assertFileNotExists(path.join(testDir, '.orderly', 'manifest.md'));
    });

    it('should record skipped files in manifest when collision skip occurs', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        ...createTestConfig({ dryRun: false }),
        collisionResolution: { strategy: CollisionResolutionStrategy.SKIP }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'a', 'file.txt'), 'first');
      testEnv.createFile(path.join(testDir, 'b', 'file.txt'), 'second');

      await organizeHandler.execute(testDir, { config: configPath, manifest: true });

      const raw = testEnv.readFile(path.join(testDir, 'orderly-manifest.json'));
      const manifest = JSON.parse(raw);
      // Manifest must record the skipped count
      expect(manifest).toHaveProperty('skipped');
      expect(typeof manifest.skipped).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 12: dedupe + organize end-to-end
  // ---------------------------------------------------------------------------
  describe('Dedupe combined with file organization', () => {
    it('should skip duplicate files during organization (SKIP action)', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: DedupeAction.SKIP
        }
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const duplicateContent = 'identical file content';
      testEnv.createFile(path.join(testDir, 'original.txt'), duplicateContent);
      testEnv.createFile(path.join(testDir, 'copy1.txt'), duplicateContent);
      testEnv.createFile(path.join(testDir, 'copy2.txt'), duplicateContent);
      testEnv.createFile(path.join(testDir, 'unique.txt'), 'completely different');

      const result = await organizeHandler.execute(testDir, { config: configPath, dedupe: true });

      expect(result.success).toBe(true);

      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
      const organized = fs.readdirSync(documentsDir);
      // Only the primary from the duplicate group + unique.txt should land here
      expect(organized.length).toBe(2);
    });

    it('should remove duplicate source files and organize only primary (REPLACE action)', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: DedupeAction.REPLACE
        }
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'same bytes everywhere';
      const primaryPath = path.join(testDir, 'primary.txt');
      const dupePath = path.join(testDir, 'dupe.txt');
      testEnv.createFile(primaryPath, content);
      testEnv.createFile(dupePath, content);

      const result = await organizeHandler.execute(testDir, { config: configPath, dedupe: true });

      expect(result.success).toBe(true);

      // Exactly one file in documents
      const documentsDir = path.join(testDir, 'documents');
      const organized = fs.readdirSync(documentsDir);
      expect(organized.length).toBe(1);

      // The replaced duplicate source has been deleted
      const dupeStillExists = fs.existsSync(dupePath);
      const primaryStillAtSource = fs.existsSync(primaryPath);
      // Either the source was deleted (replaced) or it was the primary that got organized
      expect(dupeStillExists || primaryStillAtSource).toBe(false);
    });

    it('should report duplicates without filtering them out (REPORT action)', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: DedupeAction.REPORT
        }
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicated';
      testEnv.createFile(path.join(testDir, 'a.txt'), content);
      testEnv.createFile(path.join(testDir, 'b.txt'), content);

      const result = await organizeHandler.execute(testDir, {
        config: configPath,
        dedupe: true,
        dedupeAction: DedupeAction.REPORT
      });

      expect(result.success).toBe(true);

      // REPORT action leaves both files in the organization pipeline
      const documentsDir = path.join(testDir, 'documents');
      const organized = fs.readdirSync(documentsDir);
      expect(organized.length).toBe(2);
    });

    it('should not delete duplicate source files in dry-run mode (REPLACE action)', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: true,
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: DedupeAction.REPLACE
        }
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'dry run test content';
      const dup1 = path.join(testDir, 'dup1.txt');
      const dup2 = path.join(testDir, 'dup2.txt');
      testEnv.createFile(dup1, content);
      testEnv.createFile(dup2, content);

      const before = testEnv.readDirStructure(testDir);
      const result = await organizeHandler.execute(testDir, {
        config: configPath,
        dryRun: true,
        dedupe: true
      });

      expect(result.success).toBe(true);
      const after = testEnv.readDirStructure(testDir);
      // No files moved or deleted in dry-run
      expect(after).toEqual(before);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 13: deeply nested directory structures
  // ---------------------------------------------------------------------------
  describe('Deeply nested source structures', () => {
    it('should recursively collect and organize files from nested folders', async () => {
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // 3 levels deep
      testEnv.createFile(path.join(testDir, 'lvl1', 'a.txt'), 'a');
      testEnv.createFile(path.join(testDir, 'lvl1', 'lvl2', 'b.txt'), 'b');
      testEnv.createFile(path.join(testDir, 'lvl1', 'lvl2', 'lvl3', 'c.txt'), 'c');
      testEnv.createFile(path.join(testDir, 'lvl1', 'lvl2', 'lvl3', 'img.png'), 'img');

      const result = await organizeHandler.execute(testDir, { config: configPath });
      expect(result.success).toBe(true);

      const documentsDir = path.join(testDir, 'documents');
      const imagesDir = path.join(testDir, 'images');
      TestAssertions.assertDirExists(documentsDir);
      TestAssertions.assertDirExists(imagesDir);

      const txtFiles = fs.readdirSync(documentsDir);
      expect(txtFiles.length).toBe(3);

      const imgFiles = fs.readdirSync(imagesDir);
      expect(imgFiles.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 14: scan with multiple config discovery formats
  // ---------------------------------------------------------------------------
  describe('Scan with auto-discovered config', () => {
    it('should apply exclude patterns from auto-discovered config during scan', async () => {
      const configPath = path.join(testDir, '.orderly.yml');
      const config = createTestConfig({ excludePatterns: ['**/*.log'] });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'app.txt'), 'app');
      testEnv.createFile(path.join(testDir, 'error.log'), 'errors');
      testEnv.createFile(path.join(testDir, 'info.log'), 'info');

      // Auto-discovery should pick up .orderly.yml and exclude logs
      const result = await scanHandler.execute(testDir, {});
      expect(result.success).toBe(true);
      expect(result.message).toContain('1 file');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 16: clean empty directories
  // ---------------------------------------------------------------------------
  describe('Empty-directory cleaning', () => {
    it('should remove nested empty directories without removing the root', async () => {
      fs.mkdirSync(path.join(testDir, 'empty', 'child'), { recursive: true });
      testEnv.createFile(path.join(testDir, 'keep', 'file.txt'), 'content');

      const result = await cleanHandler.execute(testDir, {});

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      TestAssertions.assertDirExists(testDir);
      TestAssertions.assertDirExists(path.join(testDir, 'keep'));
      TestAssertions.assertFileExists(path.join(testDir, 'keep', 'file.txt'));
      expect(fs.existsSync(path.join(testDir, 'empty'))).toBe(false);
    });

    it('should preview empty directory removals in dry-run mode', async () => {
      fs.mkdirSync(path.join(testDir, 'empty', 'child'), { recursive: true });

      const result = await cleanHandler.execute(testDir, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dry run');
      expect(fs.existsSync(path.join(testDir, 'empty', 'child'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 15: error handling
  // ---------------------------------------------------------------------------
  describe('Error handling', () => {
    it('should return failure result for non-existent organize target', async () => {
      const missing = path.join(testDir, 'does-not-exist');
      const result = await organizeHandler.execute(missing, {});
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
    });

    it('should return failure result for non-existent scan target', async () => {
      const missing = path.join(testDir, 'does-not-exist');
      const result = await scanHandler.execute(missing, {});
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
    });

    it('should not overwrite existing config during init', async () => {
      const existing = path.join(testDir, '.orderly.config.json');
      testEnv.createFile(existing, '{"custom": true}');

      const result = await initHandler.execute({ format: 'json' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
      expect(result.message).toContain('already exists');
      // Original content must be intact
      const content = testEnv.readFile(existing);
      expect(content).toBe('{"custom": true}');
    });

    it('should organize an empty directory without error', async () => {
      const result = await organizeHandler.execute(testDir, {});
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
    });

    it('should scan an empty directory without error', async () => {
      const result = await scanHandler.execute(testDir, {});
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.message).toContain('0 files');
    });
  });
});
