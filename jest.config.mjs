/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    verbose: true,
    transform: {
        '^.+\\.svelte$': [
            'svelte-jester',
            {
                preprocess: true,
            },
        ],
        '^.+\\.ts$': ['ts-jest',{
            babel: true,
            tsconfig: 'tsconfig.json',
            useESM: true,
            isolatedModules: true,
        }],
        '^.+\\.js$': ['babel-jest'],
    },
    moduleFileExtensions: ['js', 'ts', 'svelte'],
    // extensionsToTreatAsEsm: ['.ts', '.svelte'],
    // testEnvironment: 'jsdom',
    // moduleDirectories: [
    //     "src",
    //     "node_modules"
    // ],
    // transformIgnorePatterns: [
    //     '/node_modules/(?!@testing-library/svelte/)',
    // ],
    // moduleNameMapper: {
    //     "^(\\.{1,2}/.*)\\.js$": "$1",
    // },

    // A list of paths to modules that run some code to configure or
    // set up the testing framework before each test.
    setupFilesAfterEnv: ['<rootDir>/tests/CustomMatchers/jest.custom_matchers.setup.ts'],
    globalSetup: "./tests/global-setup.js"
};
