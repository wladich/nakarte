'use strict';

module.exports = {
    rules: {
        'import/no-mutable-exports': 'off',
        'import/no-unused-modules': ['error', {missingExports: false, unusedExports: true}],
        'import/unambiguous': 'off',
    },
};
