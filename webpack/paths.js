'use strict';

const path = require('path');

function resolveApp(relativePath) {
    return path.resolve(__dirname, '..', relativePath);
}

// config after eject: we're in ./config/
module.exports = {
    appBuild: resolveApp('build'),
    appPublic: resolveApp('public'),
    appIndexJs: resolveApp('src/index.js'),
    appIndexHtml: resolveApp('src/index.html'),
    appSrc: resolveApp('src'),
};
