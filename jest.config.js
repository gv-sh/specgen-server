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
  reporters: ['<rootDir>/reporters/customReporter.js'],
  verbose: false,
  silent: true,
  noStackTrace: true
};