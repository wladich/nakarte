'use strict';

module.exports = {
    extends: ['prettier'],
    plugins: ['prettier'],
    rules: {
        'prettier/prettier': 'error',
        /* rules softly disabled by prettier config*/
        'max-len': ['error', {code: 120}],
        'arrow-body-style': ['error', 'as-needed'],
        'curly': 'error',
        'no-confusing-arrow': 'error',
        'no-tabs': 'error',
        'no-unexpected-multiline': 'error',
        'quotes': ['error', 'single', {allowTemplateLiterals: false}],
    },
};
