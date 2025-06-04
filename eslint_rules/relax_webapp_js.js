'use strict';

module.exports = {
    rules: {
        'no-shadow': ['error', {builtinGlobals: true, allow: ['fetch']}],
    },
};
