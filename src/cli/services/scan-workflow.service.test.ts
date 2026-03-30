import { ScanWorkflow } from './scan-workflow.service';

describe('ScanWorkflow', () => {
  let mockConsoleLog: jest.SpyInstance;
  const scanner = {
    scan: jest.fn(),
    getCategorySummary: jest.fn()
  };

  let workflow: ScanWorkflow;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
    workflow = new ScanWorkflow();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  it('should render table output by default', async () => {
    scanner.scan.mockResolvedValue([
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' },
      { filename: 'file2.txt', extension: '.txt', size: 20 }
    ]);
    scanner.getCategorySummary.mockReturnValue(
      new Map([
        ['document', 1],
        ['uncategorized', 1]
      ])
    );

    await workflow.run(createCommandContext(scanner), undefined);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('\nOrderly - File Scan Results\n')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('  document: 1'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('  uncategorized: 1'));
  });

  it('should emit JSON output when format is json', async () => {
    scanner.scan.mockResolvedValue([
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' }
    ]);
    scanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));

    await workflow.run(createCommandContext(scanner), 'json');

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"summary"'));
  });

  it('should emit CSV output when format is csv', async () => {
    scanner.scan.mockResolvedValue([
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' }
    ]);
    scanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));

    await workflow.run(createCommandContext(scanner), 'csv');

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('filename,extension,category,size')
    );
  });

  it('should use uncategorized in CSV output when category is missing', async () => {
    scanner.scan.mockResolvedValue([{ filename: 'file1.txt', extension: '.txt', size: 10 }]);
    scanner.getCategorySummary.mockReturnValue(new Map());

    await workflow.run(createCommandContext(scanner), 'csv');

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt,.txt,uncategorized,10')
    );
  });

  it('should escape CSV fields containing commas, quotes, and newlines', async () => {
    scanner.scan.mockResolvedValue([
      {
        filename: 'report, "final"\ncopy.txt',
        extension: '.txt',
        size: 10,
        category: 'docs,notes'
      }
    ]);
    scanner.getCategorySummary.mockReturnValue(new Map());

    await workflow.run(createCommandContext(scanner), 'csv');

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"report, ""final""\ncopy.txt",.txt,"docs,notes",10')
    );
  });

  it('should fall back to table output for unknown formats', async () => {
    scanner.scan.mockResolvedValue([
      { filename: 'file1.txt', extension: '.txt', size: 10, category: 'document' }
    ]);
    scanner.getCategorySummary.mockReturnValue(new Map([['document', 1]]));

    await workflow.run(createCommandContext(scanner), 'xml');

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('\nOrderly - File Scan Results\n')
    );
  });

  it('should omit sample file lines when the scan is empty', async () => {
    scanner.scan.mockResolvedValue([]);
    scanner.getCategorySummary.mockReturnValue(new Map());

    await workflow.run(createCommandContext(scanner), undefined);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.not.stringContaining('Sample files:'));
  });

  it('should append a remaining-files line when more than the display limit exist', async () => {
    scanner.scan.mockResolvedValue(
      Array.from({ length: 7 }, (_, index) => ({
        filename: `file-${index + 1}.txt`,
        extension: '.txt',
        size: 10,
        category: 'document'
      }))
    );
    scanner.getCategorySummary.mockReturnValue(new Map([['document', 7]]));

    await workflow.run(createCommandContext(scanner), undefined);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('  ... and 2 more files'));
  });
});

function createCommandContext(scanner: {
  getCategorySummary: jest.Mock;
  scan: jest.Mock;
}): Parameters<ScanWorkflow['run']>[0] {
  return {
    scanner,
    targetDir: '/test/dir'
  } as unknown as Parameters<ScanWorkflow['run']>[0];
}
