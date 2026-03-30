export { CleanHandler } from './clean.command.js';
export {
  getOptionalBooleanOption,
  getOptionalStringOption,
  normalizeObjectOptions
} from './command-option.helpers.js';
export {
  createWrappedAutoConfigCommand,
  createDirectoryOptionsCommandExecutionRef,
  createWrappedCommand,
  createSingleOptionsCommandExecutionRef,
  createWrappedSingleOptionsCommand
} from './command-wrapper.helpers.js';
export {
  createCommandContextBase,
  createMappedCommandContextBase,
  createScannerCommandContext,
  logAutoDiscoveredConfig,
  normalizeCommandContextOptions
} from './command-context.helpers.js';
export { ConfigValidateHandler } from './config-validate.command.js';
export {
  createDedupeConfigOverrides,
  createReportWrites,
  DedupePreset,
  getDefaultReportPath,
  getOriginalPath,
  normalizeDedupeCommandOptions,
  resolveAction,
  resolveDedupeConfig,
  resolvePreset,
  resolveQuarantinePath,
  resolveReportPaths,
  resolveStrategyPreset,
  shouldDeleteDuplicates,
  toDeleteError,
  validateReplaceSafety,
  type IDedupeCommandContext,
  type IDedupeCommandInput,
  type IDeleteSafetyContext,
  type IFilePathSource,
  type IReportPaths
} from './dedupe.command.helpers.js';
export { DedupeHandler } from './dedupe.command.js';
export { InitHandler } from './init.command.js';
export {
  buildDedupeActionContext,
  handleReplacedDuplicates,
  handleSkippedDuplicates,
  type IDedupeActionContext,
  type IDedupeContextBuildParams
} from './organize.command.helpers.js';
export { OrganizeHandler } from './organize.command.js';
export { RevertHandler } from './revert.command.js';
export { ScanHandler } from './scan.command.js';
export { WatchHandler } from './watch.command.js';
