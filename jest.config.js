module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/cli.ts',
    '!src/**/types.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coverageDirectory: 'coverage',
  verbose: true,
  clearMocks: false,
  restoreMocks: false,
  resetMocks: false,
  testTimeout: 10000,
  maxWorkers: '50%',
  errorOnDeprecated: true,
  bail: false
};
