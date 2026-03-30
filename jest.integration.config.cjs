module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/integration'],
  testMatch: ['**/*.integration.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^chalk$': '<rootDir>/test-support/chalk.ts',
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
  verbose: true,
  clearMocks: false,
  restoreMocks: false,
  resetMocks: false,
  testTimeout: 30000,
  maxWorkers: '50%',
  errorOnDeprecated: true,
  bail: false
};
