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
import { ConfigService, DirectoryValidator, ManifestService, OrganizeWorkflow } from './services';

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

/**
 * Creates the shared organize handler.
 * @param services - Root services.
 * @returns Organize handler.
 */
function createOrganizeHandler(services: Readonly<IRootServices>): OrganizeHandler {
  return new OrganizeHandler(
    services.configService,
    services.directoryValidator,
    {
      manifestService: services.manifestService,
      cleaner: services.cleaner,
      workflow: new OrganizeWorkflow(services.manifestService, services.cleaner)
    }
  );
}

/**
 * Creates all CLI handlers from the shared root services.
 * @param services - Root services.
 * @returns Root handlers.
 */
export function createRootHandlers(services: Readonly<IRootServices>): Readonly<IRootHandlers> {
  const organizeHandler = createOrganizeHandler(services);

  return {
    clean: new CleanHandler(services.cleaner, services.configService, services.directoryValidator),
    dedupe: new DedupeHandler(
      services.configService,
      services.directoryValidator,
      new DedupeReportWriter()
    ),
    init: new InitHandler(),
    organize: organizeHandler,
    revert: new RevertHandler(),
    scan: new ScanHandler(services.configService, services.directoryValidator),
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
