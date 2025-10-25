export interface CategoryRule {
  name: string;
  extensions: string[];
  patterns?: string[];
  targetFolder?: string;
}

export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml'
}

export enum NamingConventionType {
  KEBAB_CASE = 'kebab-case',
  SNAKE_CASE = 'snake_case',
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase'
}

export interface NamingConvention {
  type: NamingConventionType;
  lowercase?: boolean;
}

import { LogLevel } from '../types';

export interface OrderlyConfig {
  categories: CategoryRule[];
  namingConvention: NamingConvention;
  excludePatterns: string[];
  includeHidden: boolean;
  dryRun: boolean;
  generateManifest: boolean;
  logLevel: LogLevel;
  logFile?: string;
  targetDirectory?: string;
}

export const DEFAULT_CONFIG: OrderlyConfig = {
  categories: [
    {
      name: 'images',
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
      targetFolder: 'images'
    },
    {
      name: 'documents',
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.md', '.odt', '.rtf'],
      targetFolder: 'documents'
    },
    {
      name: 'videos',
      extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
      targetFolder: 'videos'
    },
    {
      name: 'audio',
      extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
      targetFolder: 'audio'
    },
    {
      name: 'archives',
      extensions: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz'],
      targetFolder: 'archives'
    },
    {
      name: 'code',
      extensions: [
        '.js',
        '.ts',
        '.py',
        '.java',
        '.cpp',
        '.c',
        '.h',
        '.cs',
        '.go',
        '.rs',
        '.php',
        '.rb'
      ],
      targetFolder: 'code'
    },
    {
      name: 'spreadsheets',
      extensions: ['.xlsx', '.xls', '.csv', '.ods'],
      targetFolder: 'spreadsheets'
    },
    {
      name: 'presentations',
      extensions: ['.ppt', '.pptx', '.odp', '.key'],
      targetFolder: 'presentations'
    }
  ],
  namingConvention: {
    type: NamingConventionType.KEBAB_CASE,
    lowercase: true
  },
  excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.DS_Store'],
  includeHidden: false,
  dryRun: false,
  generateManifest: true,
  logLevel: LogLevel.INFO
};
