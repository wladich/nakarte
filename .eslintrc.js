'use strict';

const legacyFiles = require('./eslint_rules/legacy_files_list');
const vendoredFiles = './src/vendored/**/*.js';
const protobufFiles = './src/**/*_pb.js';

module.exports = {
    root: true,
    ignorePatterns: ['node_modules', 'build', 'deploy'],
    extends: ['./eslint_rules/base.js'],
    overrides: [
        {
            files: './**/*.js',
            excludedFiles: [...legacyFiles, vendoredFiles, protobufFiles],
            extends: ['./eslint_rules/prettier.js'],
        },
        {
            files: './src/**/*.js', // web application
            env: {
                browser: true,
                es2020: true,
                commonjs: true,
            },
            parser: 'babel-eslint',
            parserOptions: {
                sourceType: 'module',
            },
            globals: {
                NODE_ENV: true,
                RELEASE_VER: true,
            },
        },
        {
            files: legacyFiles, // for legacy code
            extends: ['./eslint_rules/relax_legacy.js'],
        },
        {
            files: vendoredFiles,
            extends: ['./eslint_rules/relax_vendored.js'],
        },
        {
            files: protobufFiles, // auto-generated files
            extends: ['./eslint_rules/relax_protobuf.js'],
        },
        {
            files: './test/**/*.js',
            excludedFiles: './test/karma.conf.js',
            parser: 'babel-eslint',
            extends: ['./eslint_rules/relax_tests.js'],
            env: {
                browser: true,
                mocha: true,
                es2020: true,
            },
            parserOptions: {
                sourceType: 'module',
            },
            globals: {
                require: true,
                assert: true,
            },
        },
        {
            files: [
                './webpack/**/*.js',
                './test/karma.conf.js',
                './scripts/**/*.js',
                './eslint_rules/*.js',
                './.eslintrc.js',
            ],
            env: {
                node: true,
                es2017: true,
            },
        },
        {
            files: ['./scripts/build.js', './webpack/webpack.config.js'],
            rules: {
                'no-console': 'off',
            },
        },
    ],
};
