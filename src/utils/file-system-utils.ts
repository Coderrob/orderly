import * as fs from 'node:fs';
import * as path from 'node:path';

export class FileSystemUtils {
  static existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static readFileSync(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  static writeFileSync(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!FileSystemUtils.existsSync(dir)) {
      FileSystemUtils.mkdirSync(dir);
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  static appendFileSync(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, 'utf8');
  }

  static mkdirSync(dirPath: string): void {
    if (!FileSystemUtils.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static renameSync(oldPath: string, newPath: string): void {
    fs.renameSync(oldPath, newPath);
  }

  static statSync(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }
}
