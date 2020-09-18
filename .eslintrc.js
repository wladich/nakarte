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
        /* web application */
        {
            files: './src/**/*.js',
            extends: ['./eslint_rules/relax_webapp_js.js', './eslint_rules/imports_webapp.js'],
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
