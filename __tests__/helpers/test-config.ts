import { NamingConventionType } from '../../src/config/types';

/**
 * Helper to create valid test configurations that match OrderlyConfig structure
 */
export interface ITestConfig {
  logLevel?: string;
  dryRun?: boolean;
  generateManifest?: boolean;
  includeHidden?: boolean;
  excludePatterns?: string[];
  namingConvention?: {
    type: string;
    lowercase?: boolean;
  };
  categories?: Array<{
    name: string;
    extensions: string[];
    targetFolder?: string;
  }>;
  dedupe?: {
    enabled: boolean;
    strategy: string;
    action: string;
  };
}

/**
 * Creates a minimal valid OrderlyConfig for testing
 */
export function createTestConfig(overrides?: Partial<ITestConfig>): ITestConfig {
  return {
    logLevel: 'info',
    dryRun: false,
    generateManifest: false,
    includeHidden: false,
    excludePatterns: [],
    namingConvention: {
      type: NamingConventionType.KEBAB_CASE,
      lowercase: true
    },
    categories: [
      {
        name: 'documents',
        extensions: ['.txt', '.pdf', '.doc', '.docx', '.md'],
        targetFolder: 'documents'
      },
      {
        name: 'images',
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg'],
        targetFolder: 'images'
      },
      {
        name: 'code',
        extensions: ['.js', '.ts', '.py', '.java'],
        targetFolder: 'code'
      }
    ],
    ...overrides
  };
}
