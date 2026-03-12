import * as path from 'node:path';

import { Logger } from '../../logger/logger';
import { ManifestGenerator } from '../../organizer/manifest-generator';
import type { IOrganizationResult } from '../../organizer/types';
import { LogLevel } from '../../types/logging';
import type { IManifestService } from '../interfaces';

/**
 * Service for generating and saving manifest files.
 */
export class ManifestService implements IManifestService {
  private readonly manifestGenerator: ManifestGenerator;

  /**
   * Creates a new ManifestService instance with a logger
   */
  constructor() {
    const logger = new Logger(LogLevel.INFO); // Use default log level for manifests
    this.manifestGenerator = new ManifestGenerator(logger);
  }

  /**
   * Generates and saves manifest files for an organization result.
   * @param result - Organization result to generate manifest for
   * @param outputDir - Directory to save manifest files
   */
  saveManifests(result: IOrganizationResult, outputDir: string): void {
    // Generate JSON manifest
    const manifest = this.manifestGenerator.generate(result, result.errors);
    const jsonPath = path.join(outputDir, 'orderly-manifest.json');
    this.manifestGenerator.save(manifest, jsonPath);

    // Generate Markdown manifest
    const markdownPath = path.join(outputDir, 'orderly-manifest.md');
    this.manifestGenerator.saveMarkdown(manifest, markdownPath);
  }
}
