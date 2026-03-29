import { EmptyDirectoryCleaner } from '../cleaner';
import { DedupeReportWriter } from '../dedupe';

import {
  CleanHandler,
  ConfigValidateHandler,
  DedupeHandler,
  InitHandler,
  OrganizeHandler,
  RevertHandler,
  ScanHandler,
  WatchHandler
} from './commands';
import type {
  ICleanHandler,
  IConfigValidateHandler,
  IInitHandler,
  IOrganizeHandler,
  IRevertHandler,
  IScanHandler,
  IWatchHandler
} from './interfaces';
import {
  ConfigService,
  DedupeRuntime,
  DedupeWorkflow,
  DirectoryValidator,
  ManifestService,
  OrganizeDedupeService,
  OrganizeWorkflow,
  ScanWorkflow
} from './services';

export interface IRootServices {
  readonly cleaner: EmptyDirectoryCleaner;
  readonly configService: ConfigService;
  readonly directoryValidator: DirectoryValidator;
  readonly manifestService: ManifestService;
}

export interface IRootHandlers {
  readonly clean: Readonly<ICleanHandler>;
  readonly dedupe: Readonly<DedupeHandler>;
  readonly init: Readonly<IInitHandler>;
  readonly organize: Readonly<IOrganizeHandler>;
  readonly revert: Readonly<IRevertHandler>;
  readonly scan: Readonly<IScanHandler>;
  readonly validate: Readonly<IConfigValidateHandler>;
  readonly watch: Readonly<IWatchHandler>;
}

export interface IRootWorkflows {
  readonly dedupeRuntime: Readonly<DedupeRuntime>;
  readonly dedupe: Readonly<DedupeWorkflow>;
  readonly dedupeReportWriter: Readonly<DedupeReportWriter>;
  readonly organizeDedupe: Readonly<OrganizeDedupeService>;
  readonly organize: Readonly<OrganizeWorkflow>;
  readonly scan: Readonly<ScanWorkflow>;
}

/**
 * Creates the shared dedupe handler.
 * @param services - Root services.
 * @param workflows - Root workflows.
 * @returns Dedupe handler.
 */
function createDedupeHandler(
  services: Readonly<IRootServices>,
  workflows: Readonly<IRootWorkflows>
): DedupeHandler {
  return new DedupeHandler(
    services.configService,
    services.directoryValidator,
    workflows.dedupeReportWriter,
    workflows.dedupe
  );
}

/**
 * Creates the shared organize handler.
 * @param services - Root services.
 * @param workflows - Root workflows.
 * @returns Organize handler.
 */
function createOrganizeHandler(
  services: Readonly<IRootServices>,
  workflows: Readonly<IRootWorkflows>
): OrganizeHandler {
  return new OrganizeHandler(services.configService, services.directoryValidator, {
    manifestService: services.manifestService,
    cleaner: services.cleaner,
    workflow: workflows.organize
  });
}

/**
 * Creates all CLI handlers from the shared root services.
 * @param services - Root services.
 * @param workflows - Root workflows.
 * @returns Root handlers.
 */
export function createRootHandlers(
  services: Readonly<IRootServices>,
  workflows: Readonly<IRootWorkflows> = createRootWorkflows(services)
): Readonly<IRootHandlers> {
  const organizeHandler = createOrganizeHandler(services, workflows);

  return {
    clean: new CleanHandler(services.cleaner, services.configService, services.directoryValidator),
    dedupe: createDedupeHandler(services, workflows),
    init: new InitHandler(),
    organize: organizeHandler,
    revert: new RevertHandler(),
    scan: createScanHandler(services, workflows),
    validate: new ConfigValidateHandler(services.configService),
    watch: new WatchHandler(organizeHandler)
  };
}

/**
 * Creates shared root services for the CLI runtime.
 * @returns Root services.
 */
export function createRootServices(): Readonly<IRootServices> {
  return {
    cleaner: new EmptyDirectoryCleaner(),
    configService: new ConfigService(),
    directoryValidator: new DirectoryValidator(),
    manifestService: new ManifestService()
  };
}

/**
 * Creates shared workflow collaborators for the CLI runtime.
 * @param services - Root services.
 * @returns Root workflows.
 */
export function createRootWorkflows(services: Readonly<IRootServices>): Readonly<IRootWorkflows> {
  const dedupeRuntime = new DedupeRuntime();
  const dedupeReportWriter = new DedupeReportWriter();
  const organizeDedupe = new OrganizeDedupeService(dedupeRuntime);

  return {
    dedupe: new DedupeWorkflow(dedupeReportWriter, dedupeRuntime),
    dedupeRuntime,
    dedupeReportWriter,
    organizeDedupe,
    organize: new OrganizeWorkflow(services.manifestService, services.cleaner, organizeDedupe),
    scan: new ScanWorkflow()
  };
}

/**
 * Creates the shared scan handler.
 * @param services - Root services.
 * @param workflows - Root workflows.
 * @returns Scan handler.
 */
function createScanHandler(
  services: Readonly<IRootServices>,
  workflows: Readonly<IRootWorkflows>
): ScanHandler {
  return new ScanHandler(services.configService, services.directoryValidator, workflows.scan);
}
