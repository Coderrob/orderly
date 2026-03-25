import * as fs from 'node:fs';
import * as path from 'node:path';

import { TestEnvironmentSetup } from '../../../__tests__/helpers';
import { DedupeReportWriter } from './dedupe-report-writer';

describe('DedupeReportWriter', () => {
  let testEnv: TestEnvironmentSetup;
  let rootDir: string;
  let writer: DedupeReportWriter;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    rootDir = testEnv.createTempDir();
    writer = new DedupeReportWriter();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  it('should write a JSON report', async () => {
    const outputPath = path.join(rootDir, 'dedupe.json');

    await writer.write(
      {
        groups: [],
        totalFiles: 2,
        totalDuplicates: 0,
        strategiesUsed: []
      },
      outputPath
    );

    expect(JSON.parse(fs.readFileSync(outputPath, 'utf8'))).toEqual(
      expect.objectContaining({ totalFiles: 2 })
    );
  });

  it('should write a Markdown report', async () => {
    const outputPath = path.join(rootDir, 'dedupe.md');

    await writer.writeMarkdown(
      {
        groups: [
          {
            key: 'group-1',
            strategy: 'name',
            strategies: ['name'],
            files: [
              {
                originalPath: '/target/a.txt',
                filename: 'a.txt',
                extension: '.txt',
                size: 1,
                needsRename: false
              },
              {
                originalPath: '/target/b.txt',
                filename: 'b.txt',
                extension: '.txt',
                size: 1,
                needsRename: false
              }
            ],
            primary: {
              originalPath: '/target/a.txt',
              filename: 'a.txt',
              extension: '.txt',
              size: 1,
              needsRename: false
            }
          }
        ],
        totalFiles: 2,
        totalDuplicates: 2,
        strategiesUsed: ['name']
      },
      outputPath
    );

    const markdown = fs.readFileSync(outputPath, 'utf8');
    expect(markdown).toContain('# Orderly Dedupe Report');
    expect(markdown).toContain('- Reclaimable bytes: 1');
    expect(markdown).toContain('- Shared strategies: name');
  });

  it('should write Markdown fallback values when strategies or primary are missing', async () => {
    const outputPath = path.join(rootDir, 'dedupe-fallbacks.md');

    await writer.writeMarkdown(
      {
        groups: [
          {
            key: 'group-2',
            strategy: 'sha256',
            files: [
              {
                originalPath: '/target/b.txt',
                filename: 'b.txt',
                extension: '.txt',
                size: 2,
                needsRename: false
              }
            ]
          }
        ],
        totalFiles: 1,
        totalDuplicates: 1,
        strategiesUsed: []
      },
      outputPath
    );

    const markdown = fs.readFileSync(outputPath, 'utf8');
    expect(markdown).toContain('- Strategies used: none');
    expect(markdown).toContain('- Primary: `n/a`');
  });
});
