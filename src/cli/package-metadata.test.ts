import * as fs from 'node:fs';
import * as path from 'node:path';

describe('package metadata', () => {
  it('should point the CLI bin to the executable entrypoint', () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      bin?: { orderly?: string };
      scripts?: { start?: string };
    };

    expect(packageJson.bin?.orderly).toBe('./dist/cli.js');
    expect(packageJson.scripts?.start).toBe('node dist/cli.js');
  });
});
