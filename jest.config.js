// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': ['@babel/preset-env', { targets: { node: 'current' } }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(swagger-jsdoc|swagger-ui-express)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  verbose: true
};