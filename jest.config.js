// jest.config.js
export default {
  testEnvironment: 'node',
  testTimeout: 15000,
  testMatch: ['<rootDir>/test.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(swagger-jsdoc|swagger-ui-express)/)'
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};
