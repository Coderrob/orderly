#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { ConfigLoader } from './config/config-loader';
import { Logger } from './logger/logger';
import { FileScanner } from './scanner/file-scanner';
import { FileOrganizer } from './organizer/file-organizer';
import { ManifestGenerator } from './organizer/manifest-generator';
import { DEFAULT_CONFIG } from './config/types';

const program = new Command();

program
  .name('orderly')
  .description('A configurable CLI tool for organizing files with naming conventions and full auditability')
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
  .action(async (directory: string, options: any) => {
    try {
      const config = ConfigLoader.load(options.config);
      
      if (options.dryRun) {
        config.dryRun = true;
      }
      
      if (options.manifest === false) {
        config.generateManifest = false;
      }
      
      if (options.logLevel) {
        config.logLevel = options.logLevel;
      }
      
      if (options.output) {
        config.targetDirectory = path.resolve(options.output);
      }

      const logFile = path.join(process.cwd(), '.orderly', 'orderly.log');
      const logger = new Logger(config.logLevel, logFile);
      
      console.log(chalk.blue.bold('\n🗂️  Orderly - File Organization Tool\n'));
      
      const targetDir = path.resolve(directory);
      
      if (!fs.existsSync(targetDir)) {
        logger.error(`Directory does not exist: ${targetDir}`);
        process.exit(1);
      }

      logger.info(`Target directory: ${targetDir}`);
      if (config.dryRun) {
        logger.warn('Running in DRY RUN mode - no files will be modified');
      }

      const scanner = new FileScanner(config, logger);
      const files = await scanner.scan(targetDir);

      if (files.length === 0) {
        logger.info('No files found to organize');
        return;
      }

      const summary = scanner.getCategorySummary(files);
      logger.info('\nFile categories found:');
      summary.forEach((count, category) => {
        logger.info(`  ${category}: ${count} files`);
      });

      const organizer = new FileOrganizer(config, logger, targetDir);
      const operations = organizer.planOperations(files);

      if (operations.length === 0) {
        logger.info('\n✓ All files are already organized!');
        return;
      }

      logger.info(`\nPlanned operations: ${operations.length}`);
      
      const result = await organizer.executeOperations(operations);

      logger.info(`\n${'='.repeat(50)}`);
      logger.info(chalk.green.bold(`✓ Completed: ${result.successful} operations`));
      if (result.failed > 0) {
        logger.error(chalk.red.bold(`✗ Failed: ${result.failed} operations`));
      }

      if (config.generateManifest && !config.dryRun) {
        const manifestGenerator = new ManifestGenerator(logger);
        const manifest = manifestGenerator.generate(result, result.errors);
        
        const manifestDir = path.join(process.cwd(), '.orderly');
        const manifestPath = path.join(manifestDir, 'manifest.json');
        const manifestMdPath = path.join(manifestDir, 'manifest.md');
        
        manifestGenerator.save(manifest, manifestPath);
        manifestGenerator.saveMarkdown(manifest, manifestMdPath);
        
        logger.info(`\nManifest files created in: ${manifestDir}`);
      }

      console.log(chalk.blue.bold('\n✨ Organization complete!\n'));
      
      if (result.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new configuration file')
  .option('-f, --format <format>', 'Config file format (json, yaml)', 'yaml')
  .action((options: any) => {
    try {
      const format = options.format.toLowerCase();
      let filename: string;
      
      if (format === 'json') {
        filename = 'orderly.config.json';
      } else if (format === 'yaml' || format === 'yml') {
        filename = '.orderly.yml';
      } else {
        console.error(chalk.red('Invalid format. Use json or yaml.'));
        process.exit(1);
      }

      const configPath = path.join(process.cwd(), filename);
      
      if (fs.existsSync(configPath)) {
        console.error(chalk.red(`Config file already exists: ${configPath}`));
        process.exit(1);
      }

      ConfigLoader.save(DEFAULT_CONFIG, configPath);
      console.log(chalk.green(`✓ Created config file: ${configPath}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('scan')
  .description('Scan a directory and show what would be organized')
  .argument('[directory]', 'Directory to scan', '.')
  .option('-c, --config <path>', 'Path to config file')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .action(async (directory: string, options: any) => {
    try {
      const config = ConfigLoader.load(options.config);
      config.dryRun = true;
      
      if (options.logLevel) {
        config.logLevel = options.logLevel;
      }

      const logger = new Logger(config.logLevel);
      
      console.log(chalk.blue.bold('\n🔍 Scanning directory...\n'));
      
      const targetDir = path.resolve(directory);
      
      if (!fs.existsSync(targetDir)) {
        logger.error(`Directory does not exist: ${targetDir}`);
        process.exit(1);
      }

      const scanner = new FileScanner(config, logger);
      const files = await scanner.scan(targetDir);

      if (files.length === 0) {
        logger.info('No files found');
        return;
      }

      const summary = scanner.getCategorySummary(files);
      console.log(chalk.bold('\nFile categories:'));
      summary.forEach((count, category) => {
        console.log(`  ${chalk.cyan(category)}: ${count} files`);
      });

      const organizer = new FileOrganizer(config, logger, targetDir);
      const operations = organizer.planOperations(files);

      console.log(chalk.bold(`\nOperations needed: ${operations.length}`));
      
      const operationTypes = {
        move: 0,
        rename: 0,
        'move-rename': 0
      };

      for (const op of operations) {
        operationTypes[op.type]++;
      }

      console.log(`  Move: ${operationTypes.move}`);
      console.log(`  Rename: ${operationTypes.rename}`);
      console.log(`  Move + Rename: ${operationTypes['move-rename']}`);

      console.log(chalk.blue.bold('\n✨ Scan complete!\n'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
