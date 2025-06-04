'use strict';

const webpackConfig = require('../webpack/webpack.config');

webpackConfig.entry = {};

module.exports = function (config) {
    config.glob = config.glob ? config.glob : './test/**/*.js';
    config.set({
        basePath: '../',
        frameworks: ['mocha', 'chai', 'webpack'],
        files: [config.glob],
        preprocessors: {
            './test/test_*.js': ['webpack'],
        },
        webpack: webpackConfig,
        webpackMiddleware: {
            stats: 'errors-only',
        },
        reporters: ['mocha'],
        port: 9876, // karma web server port
        colors: true,
        logLevel: config.LOG_INFO,
        client: {
            mocha: {
                ui: 'qunit',
                reporter: 'spec',
            },
        },
        mochaReporter: {
            showDiff: true,
        },
        customLaunchers: {
            ChromiumHeadlessInDocker: {
                base: 'ChromiumHeadless',
                flags: ['--no-sandbox'],
            },
        },
    });
};
