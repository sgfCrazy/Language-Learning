/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@app/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@app/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1.ts',
  },
  testMatch: ['**/*.e2e-spec.ts', '**/*.spec.ts'],
  clearMocks: true,
};
