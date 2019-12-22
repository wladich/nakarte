const webpackConfig = require('../webpack/webpack.config');

module.exports = function(config) {
    config.set({
        basePath: '../',
        frameworks: ['mocha', 'chai'],
        files: [
            { pattern: './test/**/*.js'},
        ],
        preprocessors: {
            './test/**/*.js': ['webpack']
        },
        webpack: webpackConfig,
        webpackMiddleware: {
            stats: 'errors-only',
        },
        reporters: ['mocha'],
        port: 9876,  // karma web server port
        colors: true,
        logLevel: config.LOG_INFO,
        client: {
            mocha: {
                ui: 'qunit',
                reporter: 'spec',
            }
        },
        mochaReporter: {
            showDiff: true
        }
      });
};
