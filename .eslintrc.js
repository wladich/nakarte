'use strict';

const legacyFiles = require('./eslint_rules/legacy_files_list');

const vendoredFiles = './src/vendored/**/*.js';
const protobufFiles = './src/**/*_pb.js';

module.exports = {
    root: true,
    ignorePatterns: ['node_modules', 'build', 'deploy'],
    extends: ['./eslint_rules/base.js', './eslint_rules/imports.js'],
    overrides: [
        /* all new js code */
        {
            files: './**/*.js',
            excludedFiles: [...legacyFiles, vendoredFiles, protobufFiles],
            extends: ['./eslint_rules/prettier.js'],
        },
        /* typescript code */
        {
            files: './**/*.ts',
            extends: ['./eslint_rules/prettier.js', './eslint_rules/typescript.js', 'prettier/@typescript-eslint'],
            rules: {
                // re-enable rules softly disabled by prettier/@typescript-eslint
                '@typescript-eslint/quotes': ['error', 'single', {allowTemplateLiterals: false}],
            },
        },
        /* web application */
        {
            files: ['./src/**/*.js', './src/**/*.ts'],
            extends: ['./eslint_rules/imports_webapp.js'],
            env: {
                browser: true,
                es2020: true,
            },
            globals: {
                NODE_ENV: true,
                RELEASE_VER: true,
            },
            overrides: [
                {
                    files: './src/**/*.js',
                    parser: 'babel-eslint',
                    parserOptions: {
                        sourceType: 'module',
                    },
                },
            ],
        },
        /* web application legacy code*/
        {
            files: legacyFiles,
            extends: ['./eslint_rules/relax_legacy.js', './eslint_rules/imports_relax_legacy.js'],
        },
        /* vendored files*/
        {
            files: vendoredFiles,
            extends: ['./eslint_rules/relax_vendored.js', './eslint_rules/imports_relax_vendored.js'],
        },
        /* auto-generated files */
        {
            files: protobufFiles,
            extends: ['./eslint_rules/relax_protobuf.js', './eslint_rules/imports_relax_protobuf.js'],
            env: {
                commonjs: true,
            },
        },
        /* tests code */
        {
            files: './test/**/*.js',
            excludedFiles: './test/karma.conf.js',
            parser: 'babel-eslint',
            extends: ['./eslint_rules/relax_tests.js', './eslint_rules/imports_tests.js'],
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
        /* config code */
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
            extends: ['./eslint_rules/imports_configs.js'],
        },
        /* command line scripts */
        {
            files: ['./scripts/build.js', './webpack/webpack.config.js'],
            rules: {
                'no-console': 'off',
            },
        },
    ],
};
