#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'node:path';
import chalk from 'chalk';
import { ConfigLoader } from './config/config-loader';
import { Logger, LogLevel } from './logger/logger';
import { FileScanner, ScannedFile } from './scanner/file-scanner';
import { FileOrganizer, OrganizationResult, FileOperationType } from './organizer/file-organizer';
import { ManifestGenerator } from './organizer/manifest-generator';
import { DEFAULT_CONFIG, OrderlyConfig } from './config/types';
import { FileSystemUtils } from './utils/file-system-utils';

interface OrganizeOptions {
  config?: string;
  dryRun?: boolean;
  manifest?: boolean;
  logLevel?: string;
  output?: string;
}

interface InitOptions {
  format?: string;
}

interface ScanOptions {
  config?: string;
  logLevel?: string;
}

const program = new Command();

program
  .name('orderly')
  .description(
    'A configurable CLI tool for organizing files with naming conventions and full auditability'
  )
  .version('1.0.0');

program
  .command('organize')
  .description('Organize files in a directory')
  .argument('[directory]', 'Directory to organize', '.')
  .option('-c, --config <path>', 'Path to config file')
  .option('-d, --dry-run', 'Preview changes without applying them')
  .option('--no-manifest', 'Skip manifest generation')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('-o, --output <path>', 'Output directory for organized files')
  .action(async (directory: string, options: OrganizeOptions) => {
    try {
      const config = loadConfig(options);
      const logger = createLogger(config.logLevel);

      console.log(chalk.blue.bold('\n🗂️  Orderly - File Organization Tool\n'));

      const targetDir = validateDirectory(directory, logger);
      logConfiguration(targetDir, config.dryRun, logger);

      const scanner = new FileScanner(config, logger);
      const files = await scanner.scan(targetDir);

      if (files.length === 0) {
        logger.info('No files found to organize');
        return;
      }

      logFileSummary(scanner, files, logger);

      const organizer = new FileOrganizer(config, logger, targetDir);
      const operations = organizer.planOperations(files);

      if (operations.length === 0) {
        logger.info('\n✓ All files are already organized!');
        return;
      }

      logger.info(`\nPlanned operations: ${operations.length}`);
      const result = organizer.executeOperations(operations);

      logResults(result, logger);

      if (config.generateManifest && !config.dryRun) {
        saveManifests(result, logger);
      }

      console.log(chalk.blue.bold('\n✨ Organization complete!\n'));

      if (result.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('init')
  .description('Initialize a new configuration file')
  .option('-f, --format <format>', 'Config file format (json, yaml)', 'yaml')
  .action((options: InitOptions) => {
    try {
      const format = validateFormat(options.format ?? 'yaml');
      const filename = getFilename(format);
      const configPath = path.join(process.cwd(), filename);

      if (FileSystemUtils.existsSync(configPath)) {
        console.error(chalk.red(`Config file already exists: ${configPath}`));
        process.exit(1);
      }

      ConfigLoader.save(DEFAULT_CONFIG, configPath);
      console.log(chalk.green(`✓ Created config file: ${configPath}`));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('scan')
  .description('Scan a directory and show what would be organized')
  .argument('[directory]', 'Directory to scan', '.')
  .option('-c, --config <path>', 'Path to config file')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .action(async (directory: string, options: ScanOptions) => {
    try {
      const config = ConfigLoader.load(options.config);
      config.dryRun = true;
      if (options.logLevel) config.logLevel = options.logLevel as LogLevel;

      const logger = new Logger(config.logLevel);
      console.log(chalk.blue.bold('\n🔍 Scanning directory...\n'));

      const targetDir = validateDirectory(directory, logger);
      const scanner = new FileScanner(config, logger);
      const files = await scanner.scan(targetDir);

      if (files.length === 0) {
        logger.info('No files found');
        return;
      }

      displayScanResults(scanner, files, config, logger, targetDir);
      console.log(chalk.blue.bold('\n✨ Scan complete!\n'));
    } catch (error) {
      handleError(error);
    }
  });

program.parse();

function loadConfig(options: OrganizeOptions): OrderlyConfig {
  const config = ConfigLoader.load(options.config);
  if (options.dryRun) config.dryRun = true;
  if (options.manifest === false) config.generateManifest = false;
  if (options.logLevel) config.logLevel = options.logLevel as LogLevel;
  if (options.output) config.targetDirectory = path.resolve(options.output);
  return config;
}

function createLogger(logLevel: string): Logger {
  const logFile = path.join(process.cwd(), '.orderly', 'orderly.log');
  return new Logger(logLevel as LogLevel, logFile);
}

function validateDirectory(directory: string, logger: Logger) {
  const targetDir = path.resolve(directory);
  if (!FileSystemUtils.existsSync(targetDir)) {
    logger.error(`Directory does not exist: ${targetDir}`);
    process.exit(1);
  }
  return targetDir;
}

function logConfiguration(targetDir: string, dryRun: boolean, logger: Logger) {
  logger.info(`Target directory: ${targetDir}`);
  if (dryRun) {
    logger.warn('Running in DRY RUN mode - no files will be modified');
  }
}

function logFileSummary(scanner: FileScanner, files: ScannedFile[], logger: Logger): void {
  const summary = scanner.getCategorySummary(files);
  logger.info('\nFile categories found:');
  for (const [category, count] of summary) {
    logger.info(`  ${category}: ${count} files`);
  }
}

function logResults(result: OrganizationResult, logger: Logger): void {
  logger.info(`\n${'='.repeat(50)}`);
  logger.info(chalk.green.bold(`✓ Completed: ${result.successful} operations`));
  if (result.failed > 0) {
    logger.error(chalk.red.bold(`✗ Failed: ${result.failed} operations`));
  }
}

function saveManifests(result: OrganizationResult, logger: Logger): void {
  const manifestGenerator = new ManifestGenerator(logger);
  const manifest = manifestGenerator.generate(result, result.errors);

  const manifestDir = path.join(process.cwd(), '.orderly');
  manifestGenerator.save(manifest, path.join(manifestDir, 'manifest.json'));
  manifestGenerator.saveMarkdown(manifest, path.join(manifestDir, 'manifest.md'));

  logger.info(`\nManifest files created in: ${manifestDir}`);
}

function validateFormat(format: string): string {
  const normalized = format.toLowerCase();
  if (normalized !== 'json' && normalized !== 'yaml' && normalized !== 'yml') {
    console.error(chalk.red('Invalid format. Use json or yaml.'));
    process.exit(1);
  }
  return normalized;
}

function getFilename(format: string): string {
  return format === 'json' ? 'orderly.config.json' : '.orderly.yml';
}

function displayScanResults(
  scanner: FileScanner,
  files: ScannedFile[],
  config: OrderlyConfig,
  logger: Logger,
  targetDir: string
): void {
  const summary = scanner.getCategorySummary(files);
  console.log(chalk.bold('\nFile categories:'));
  for (const [category, count] of summary) {
    console.log(`  ${chalk.cyan(category)}: ${count} files`);
  }

  const organizer = new FileOrganizer(config, logger, targetDir);
  const operations = organizer.planOperations(files);
  console.log(chalk.bold(`\nOperations needed: ${operations.length}`));

  const operationTypes = {
    [FileOperationType.MOVE]: 0,
    [FileOperationType.RENAME]: 0,
    [FileOperationType.MOVE_RENAME]: 0
  };
  for (const op of operations) {
    operationTypes[op.type]++;
  }

  console.log(`  Move: ${operationTypes[FileOperationType.MOVE]}`);
  console.log(`  Rename: ${operationTypes[FileOperationType.RENAME]}`);
  console.log(`  Move + Rename: ${operationTypes[FileOperationType.MOVE_RENAME]}`);
}

function handleError(error: unknown) {
  console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  process.exit(1);
}
