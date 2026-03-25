import * as path from 'node:path';

import { ConfigLoader } from '../../config/config-loader';
import { DEFAULT_CONFIG, NamingConventionType, type OrderlyConfig } from '../../config/types';
import {
  ARCHIVE_EXTENSIONS,
  AUDIO_EXTENSIONS,
  CODE_EXTENSIONS,
  DEFAULT_CATEGORIES,
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS
} from '../../constants';
import { DedupeAction, DedupeMode, type IDedupeConfig } from '../../dedupe/types';
import { CLI_CONSTANTS, COMMAND_MESSAGES, ConfigFileFormat, ExitCode } from '../constants';
import { WithCommandAudit } from '../decorators/command-audit.decorator';
import { HandleCommandErrors } from '../decorators/command-error-handler.decorator';
import { WithCommandTelemetry } from '../decorators/command-telemetry.decorator';
import type { ICommandResult, IInitHandler, IInitOptions } from '../interfaces';

const TEMPLATE_DOWNLOADS = 'downloads';
const TEMPLATE_MEDIA_LIBRARY = 'media-library';
const TEMPLATE_DEVELOPER_WORKSPACE = 'developer-workspace';
const TEMPLATE_PHOTOS_ONLY = 'photos-only';
const CATEGORY_AUDIO = 'audio';
const CATEGORY_ARCHIVES = 'archives';
const CATEGORY_CODE = 'code';
const CATEGORY_DOCUMENTS = 'documents';
const CATEGORY_PHOTOS = 'photos';
const CATEGORY_VIDEOS = 'videos';

/**
 * Handler for the init command.
 */
export class InitHandler implements IInitHandler {
  /**
   * Executes the init command.
   * @param options - Init command options
   * @returns Command result
   */
  @WithCommandAudit('init')
  @WithCommandTelemetry('init')
  @HandleCommandErrors(COMMAND_MESSAGES.INIT_FAILED)
  execute(options: Readonly<IInitOptions>): Promise<ICommandResult> {
    const format = options.format || CLI_CONSTANTS.DEFAULT_CONFIG_FORMAT;
    const configPath = this.getConfigPath(format);
    const templateName = this.resolveTemplateName(options.template);
    return this.hasExistingConfig(configPath)
      ? Promise.resolve(this.buildFailureResult(configPath))
      : this.createConfig(configPath, templateName);
  }

  /**
   * Creates the config file and returns a success result.
   * @param configPath - Path where the config file will be written.
   * @param templateName - Template name used to build the config.
   * @returns Success result payload.
   */
  private createConfig(configPath: string, templateName: string): Promise<ICommandResult> {
    const template = createTemplate(templateName);
    ConfigLoader.save(template, configPath);
    return Promise.resolve({
      success: true,
      exitCode: ExitCode.SUCCESS,
      message: COMMAND_MESSAGES.CONFIG_TEMPLATE_CREATED.replace('{0}', templateName).replace(
        '{1}',
        configPath
      )
    });
  }

  /**
   * Builds the failure result used when a config file already exists.
   * @param configPath - Existing config file path.
   * @returns Failure result payload.
   */
  private buildFailureResult(configPath: string): ICommandResult {
    return {
      success: false,
      exitCode: ExitCode.ERROR,
      message: `${COMMAND_MESSAGES.CONFIG_EXISTS}${configPath}`
    };
  }

  /**
   * Gets the configuration file path based on format.
   * @param format - Configuration format (json or yaml)
   * @returns Configuration file path
   */
  private getConfigPath(format: ConfigFileFormat | string): string {
    const formatLower = String(format).toLowerCase();
    const extension =
      formatLower === `${ConfigFileFormat.YAML}` || formatLower === `${ConfigFileFormat.YML}`
        ? ConfigFileFormat.YAML
        : ConfigFileFormat.JSON;
    return path.resolve(`${CLI_CONSTANTS.CONFIG_PREFIX}${extension}`);
  }

  /**
   * Checks if a configuration file already exists.
   * @param configPath - Path to check
   * @returns True if the file exists.
   */
  private hasExistingConfig(configPath: string): boolean {
    try {
      ConfigLoader.load(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves a requested template name to a supported template.
   * @param template - Requested template name.
   * @returns Supported template name.
   */
  private resolveTemplateName(template?: string): string {
    switch (template) {
      case TEMPLATE_DEVELOPER_WORKSPACE:
      case TEMPLATE_MEDIA_LIBRARY:
      case TEMPLATE_PHOTOS_ONLY:
      case TEMPLATE_DOWNLOADS:
        return template;
      default:
        return TEMPLATE_DOWNLOADS;
    }
  }
}

/**
 * Creates the developer-workspace categories.
 * @returns Developer-workspace categories.
 */
function createDeveloperWorkspaceCategories(): ReadonlyArray<{
  name: string;
  extensions: readonly string[];
  targetFolder: string;
}> {
  return [
    { name: CATEGORY_CODE, extensions: CODE_EXTENSIONS, targetFolder: CATEGORY_CODE },
    { name: CATEGORY_DOCUMENTS, extensions: DOCUMENT_EXTENSIONS, targetFolder: 'docs' },
    { name: CATEGORY_ARCHIVES, extensions: ARCHIVE_EXTENSIONS, targetFolder: CATEGORY_ARCHIVES }
  ];
}

/**
 * Creates the developer-workspace exclude patterns.
 * @returns Developer-workspace exclude patterns.
 */
function createDeveloperWorkspaceExcludePatterns(): readonly string[] {
  return Array.from([...DEFAULT_CONFIG.excludePatterns, 'coverage/**', '.next/**']);
}

/**
 * Creates a developer workspace template.
 * @returns Developer-workspace config.
 */
function createDeveloperWorkspaceTemplate(): OrderlyConfig {
  return {
    ...DEFAULT_CONFIG,
    categories: Array.from(createDeveloperWorkspaceCategories()),
    namingConvention: {
      type: NamingConventionType.KEBAB_CASE,
      lowercase: true
    },
    excludePatterns: Array.from(createDeveloperWorkspaceExcludePatterns()),
    dedupe: createDisabledSafeDedupeConfig()
  };
}

/**
 * Creates the disabled safe dedupe config.
 * @returns Safe dedupe config.
 */
function createDisabledSafeDedupeConfig(): IDedupeConfig {
  return {
    enabled: false,
    recursive: false,
    strategy: { mode: DedupeMode.ANY, size: true, sha256: true },
    action: DedupeAction.SKIP
  };
}

/**
 * Creates the default downloads template.
 * @returns Downloads-focused config.
 */
function createDownloadsTemplate(): OrderlyConfig {
  return {
    ...DEFAULT_CONFIG,
    categories: Array.from(DEFAULT_CATEGORIES),
    dedupe: createDisabledSafeDedupeConfig()
  };
}

/**
 * Creates the media-library categories.
 * @returns Media-library categories.
 */
function createMediaLibraryCategories(): ReadonlyArray<{
  name: string;
  extensions: readonly string[];
  targetFolder: string;
}> {
  return [
    { name: CATEGORY_PHOTOS, extensions: IMAGE_EXTENSIONS, targetFolder: CATEGORY_PHOTOS },
    { name: CATEGORY_VIDEOS, extensions: VIDEO_EXTENSIONS, targetFolder: CATEGORY_VIDEOS },
    { name: CATEGORY_AUDIO, extensions: AUDIO_EXTENSIONS, targetFolder: CATEGORY_AUDIO },
    { name: CATEGORY_DOCUMENTS, extensions: DOCUMENT_EXTENSIONS, targetFolder: CATEGORY_DOCUMENTS }
  ];
}

/**
 * Creates a media library template.
 * @returns Media-library config.
 */
function createMediaLibraryTemplate(): OrderlyConfig {
  return {
    ...DEFAULT_CONFIG,
    categories: Array.from(createMediaLibraryCategories()),
    dedupe: createReportedMediaDedupeConfig()
  };
}

/**
 * Creates the photos-only dedupe config.
 * @returns Photos-only dedupe config.
 */
function createPhotosOnlyDedupeConfig(): IDedupeConfig {
  return {
    enabled: true,
    recursive: false,
    strategy: {
      mode: DedupeMode.ALL,
      size: true,
      sha256: true,
      imageDimensions: true,
      exif: true
    },
    action: DedupeAction.REPORT
  };
}

/**
 * Creates a photo-library template.
 * @returns Photos-only config.
 */
function createPhotosOnlyTemplate(): OrderlyConfig {
  return {
    ...DEFAULT_CONFIG,
    categories: [
      { name: CATEGORY_PHOTOS, extensions: IMAGE_EXTENSIONS, targetFolder: CATEGORY_PHOTOS }
    ],
    dedupe: createPhotosOnlyDedupeConfig()
  };
}

/**
 * Creates a report-oriented media dedupe config.
 * @returns Media dedupe config.
 */
function createReportedMediaDedupeConfig(): IDedupeConfig {
  return {
    enabled: true,
    recursive: false,
    strategy: {
      mode: DedupeMode.ALL,
      size: true,
      sha256: true,
      imageDimensions: true
    },
    action: DedupeAction.REPORT
  };
}

/**
 * Creates a config template by name.
 * @param templateName - Template name.
 * @returns Template config.
 */
function createTemplate(templateName: string): OrderlyConfig {
  switch (templateName) {
    case TEMPLATE_DEVELOPER_WORKSPACE:
      return createDeveloperWorkspaceTemplate();
    case TEMPLATE_MEDIA_LIBRARY:
      return createMediaLibraryTemplate();
    case TEMPLATE_PHOTOS_ONLY:
      return createPhotosOnlyTemplate();
    case TEMPLATE_DOWNLOADS:
    default:
      return createDownloadsTemplate();
  }
}
