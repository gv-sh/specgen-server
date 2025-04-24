// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  moduleFileExtensions: ['js', 'json'],
  moduleDirectories: ['node_modules'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(swagger-jsdoc|swagger-ui-express)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  reporters: [
    'default',
    ['jest-silent-reporter', {
      useDots: true,
      suppressConsole: false,
      showPaths: true,
      showWarnings: true,
      showErrors: true,
      logDirPath: './logs',
      logFileName: `test-results-${new Date().toISOString().replace(/:/g, '-')}.log`
    }]
  ],
  verbose: false,
  silent: false,
  noStackTrace: true
};