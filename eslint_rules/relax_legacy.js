'use strict';

module.exports = {
    rules: {
        'no-constant-condition': ['error', {checkLoops: false}], // allow `while (true)`
        'no-prototype-builtins': 'off',
        'no-invalid-this': 'off', // 44 occurencies in old code
        'no-magic-numbers': 'off', // 1188 occurencies in old code
        'no-param-reassign': 'off', // 91 occurencies in old code
        'no-warning-comments': 'off', // 15 occurencies in old code
        'no-shadow': 'off', // 83 occurencies in old code
        'camelcase': 'off', // 203 occurencies in old code
        'comma-dangle': ['error', 'only-multiline'], // 697 issues with always-multiline
        'quotes': 'off', // 73 occurencies in old code
        'function-paren-newline': 'off', // > 200 occurencies in old code
        'indent': 'off', // > 7000 occurencies in old code
        'no-multi-assign': 'off', // 31 occurencies in old code
        'no-var': 'off', // 330 occurencies in old code
        'one-var': 'off', // 122 occurencies in old code
        'prefer-const': 'off', // 375 occurencies in old code
        'prefer-template': 'off', // 70 occurencies in old code,
    },
};
