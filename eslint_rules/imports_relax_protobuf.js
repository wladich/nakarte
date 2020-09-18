'use strict';

module.exports = {
    rules: {
        'import/no-unused-modules': ['error', {missingExports: false, unusedExports: true}],
        'import/unambiguous': 'off',
        'import/no-commonjs': 'off',
    },
};
