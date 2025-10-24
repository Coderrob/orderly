import * as fs from 'fs';
import * as path from 'node:path';

export class FileSystemUtils {
  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  static writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!FileSystemUtils.exists(dir)) {
      FileSystemUtils.mkdir(dir);
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  static appendFile(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, 'utf8');
  }

  static mkdir(dirPath: string): void {
    if (!FileSystemUtils.exists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static rename(oldPath: string, newPath: string): void {
    fs.renameSync(oldPath, newPath);
  }

  static stat(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }
}
