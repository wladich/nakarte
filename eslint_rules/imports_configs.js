'use strict';

module.exports = {
    rules: {
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: true,
                optionalDependencies: false,
                peerDependencies: false,
                bundledDependencies: false,
            },
        ],
        'import/no-unused-modules': 'off',
        'import/no-commonjs': 'off',
    },
};
