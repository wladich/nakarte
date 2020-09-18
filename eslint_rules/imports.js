'use strict';

module.exports = {
    plugins: ['import'],
    rules: {
        'import/no-unresolved': ['error', {commonjs: true, amd: true}],
        'import/named': 'error',
        'import/default': 'error',
        'import/namespace': 'error',
        // 'import/no-restricted-paths)', // may be add sometime
        'import/no-absolute-path': 'error',
        'import/no-dynamic-require': 'error',
        // 'import/no-internal-modules': 'error', // checked, declined
        'import/no-webpack-loader-syntax': 'error',
        'import/no-self-import': 'error',
        'import/no-cycle': 'error',
        'import/no-useless-path-segments': ['error', {noUselessIndex: true}],
        // 'import/no-relative-parent-imports': 'error', // checked, declined
        'import/export': 'error',
        'import/no-named-as-default': 'error',
        'import/no-named-as-default-member': 'error',
        'import/no-deprecated': 'error',
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: false,
                optionalDependencies: false,
                peerDependencies: false,
                bundledDependencies: false,
            },
        ],
        'import/no-mutable-exports': 'error',
        'import/no-unused-modules': ['error', {missingExports: true, unusedExports: true}],
        'import/unambiguous': 'error',
        'import/no-commonjs': 'error',
        'import/no-amd': 'error',
        'import/first': 'error',
        'import/exports-last': 'error',
        'import/no-duplicates': 'error',
        // 'import/no-namespace': 'error', // checked, declined
        'import/extensions': ['error', 'always', {js: 'never'}],
        'import/order': [
            'error',
            {
                'groups': [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index'], 'object', 'unknown'],
                'pathGroups': [{pattern: '~/**', group: 'internal'}],
                'newlines-between': 'always',
                'alphabetize': {order: 'asc', caseInsensitive: true},
            },
        ],
        'import/newline-after-import': 'error',
        // 'import/prefer-default-export': 'error', // checked, declined
        // 'import/max-dependencies': 'error', // checked, declined
        'import/no-unassigned-import': 'error',
        'import/no-named-default': 'error',
        // 'import/no-default-export': 'error', // checked, declined
        // 'import/no-named-export': 'error', // checked, declined
        'import/no-anonymous-default-export': 'error',
        'import/group-exports': 'error',
        // 'import/dynamic-import-chunkname': 'error', // checked, no idea why to use
    },
    settings: {
        'import/resolver': {
            node: {}, // workaround for https://github.com/benmosher/eslint-plugin-import/issues/1861
            webpack: {
                config: './webpack/webpack.config.js',
                env: {
                    NODE_ENV: 'production',
                },
            },
        },
    },
};
