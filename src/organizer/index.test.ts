import * as organizer from './index';

describe('organizer index exports', () => {
  it('should expose organizer components', () => {
    expect(organizer.FileOrganizer).toBeDefined();
    expect(organizer.ManifestBuilder).toBeDefined();
    expect(organizer.ManifestFormatter).toBeDefined();
    expect(organizer.ManifestGenerator).toBeDefined();
    expect(organizer.OperationExecutor).toBeDefined();
    expect(organizer.OperationPlanner).toBeDefined();
    expect(organizer.FileOperationType).toBeDefined();
    expect(organizer.OperationStatus).toBeDefined();
  });
});
