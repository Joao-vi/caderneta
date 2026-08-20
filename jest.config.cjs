module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/test/styleStub.cjs',
  },
  collectCoverageFrom: ['src/domain/**/*.js'],
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
};
