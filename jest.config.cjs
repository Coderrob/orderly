module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^dist/(.*)$': '<rootDir>/dist/$1'
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json'
      }
    ]
  },
  transformIgnorePatterns: ['node_modules/(?!(chalk)/)'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/cli.ts',
    '!src/**/types.ts',
    '!src/**/types/**',
    '!src/**/index.ts',
    '!src/**/interfaces.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json', 'json-summary'],
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
