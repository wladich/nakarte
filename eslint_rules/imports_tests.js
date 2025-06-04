'use strict';

module.exports = {
    rules: {
        'import/no-unused-modules': ['error', {missingExports: false, unusedExports: true}],
    },
};
