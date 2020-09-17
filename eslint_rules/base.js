'use strict';

module.exports = {
    extends: ['eslint:recommended'],
    rules: {
        'accessor-pairs': 'error',
        'array-bracket-newline': ['error', 'consistent'],
        'array-bracket-spacing': 'error',
        'array-callback-return': 'error',
        'array-element-newline': ['error', 'consistent'],
        'arrow-body-style': ['error', 'as-needed'], // disabled by prettier-config
        'arrow-parens': 'error',
        'arrow-spacing': 'error',
        'block-scoped-var': 'error',
        // 'block-spacing': 'error', // for single line blocks, not needed
        'brace-style': 'error',
        // 'callback-return': 'error', // specific to nodejs, skip
        'camelcase': ['error', {allow: ['_unused_[^_]+']}],
        // 'capitalized-comments': 'error', // checked, declined
        // 'class-methods-use-this': 'error', // checked, declined
        'comma-dangle': ['error', 'always-multiline'],
        'comma-spacing': 'error',
        'comma-style': 'error',
        'complexity': 'error',
        'computed-property-spacing': 'error',
        'consistent-return': 'error',
        'consistent-this': 'error',
        // 'constructor-super': 'error', // in eslint-recommended
        'curly': 'error', // disabled by prettier-config
        'default-case': 'error',
        'default-param-last': 'error',
        'dot-location': ['error', 'property'],
        // 'dot-notation': 'error', // checked, declined
        'eol-last': 'error',
        'eqeqeq': 'error',
        // 'for-direction': 'error', // in eslint-recommended
        'func-call-spacing': 'error',
        // 'func-name-matching': 'error', // checked, declined
        // 'func-names': 'error', // checked, declined
        'func-style': ['error', 'declaration'],
        // 'function-call-argument-newline': 'error', // checked, declined
        'function-paren-newline': 'error',
        'generator-star-spacing': ['error', {named: 'after', anonymous: 'neither', method: 'before'}],
        // 'getter-return': 'error', // in eslint-recommended
        // 'global-require': 'error',  // specific to nodejs, skip
        'grouped-accessor-pairs': 'error',
        'guard-for-in': 'error',
        // 'handle-callback-err': 'error', // specific to nodejs, skip
        // 'id-blacklist': 'error', // checked, declined
        // 'id-length': 'error', // checked, declined
        // 'id-match': 'error', // checked, declined
        // 'implicit-arrow-linebreak': 'error', // checked, declined
        'indent': 'error',
        // 'init-declarations': 'error', // checked, declined
        // 'jsx-quotes': 'error', // jsx not used
        'key-spacing': 'error',
        'keyword-spacing': 'error',
        // 'line-comment-position': 'error', //checked, declined
        'linebreak-style': 'error',
        // 'lines-around-comment': 'error', // checked, declined
        'lines-between-class-members': ['error', 'always', {exceptAfterSingleLine: true}],
        // 'max-classes-per-file': 'error', // checked, declined
        'max-depth': 'error',
        'max-len': ['error', {code: 120}],
        // 'max-lines': 'error', // checked, declined
        // 'max-lines-per-function': 'error', // checked, declined
        'max-nested-callbacks': ['error', 2],
        // 'max-params': 'error', // checked, declined
        // 'max-statements': 'error', // checked, declined
        'max-statements-per-line': 'error',
        // 'multiline-comment-style': 'error', // checked, declined
        // 'multiline-ternary': 'error', // checked, declined
        'new-cap': 'error',
        'new-parens': 'error',
        // 'newline-per-chained-call': 'error', // checked, declined
        // 'no-alert': 'error', // checked, declined
        'no-array-constructor': 'error',
        // 'no-async-promise-executor': 'error', // in eslint-recommended
        // 'no-await-in-loop': 'error', // checked, declined
        // 'no-bitwise': 'error', // checked, declined
        // 'no-buffer-constructor': 'error', // specific to nodejs, skip
        'no-caller': 'error',
        // 'no-case-declarations': 'error', // in eslint-recommended
        // 'no-class-assign': 'error', // in eslint-recommended
        // 'no-compare-neg-zero': 'error', // in eslint-recommended
        // 'no-cond-assign': 'error', // in eslint-recommended
        'no-confusing-arrow': 'error',
        'no-console': 'error',
        // 'no-const-assign': 'error', // in eslint-recommended
        // 'no-constant-condition': 'error', // in eslint-recommended
        'no-constructor-return': 'error',
        // 'no-continue': 'error', // checked, declined
        // 'no-control-regex': 'error', // in eslint-recommended
        // 'no-debugger': 'error', // in eslint-recommended
        // 'no-delete-var': 'error', // in eslint-recommended
        // 'no-div-regex': 'error', // checked, declined
        // 'no-dupe-args': 'error', // in eslint-recommended
        // 'no-dupe-class-members': 'error', // in eslint-recommended
        'no-dupe-else-if': 'error',
        // 'no-dupe-keys': 'error', // in eslint-recommended
        // 'no-duplicate-case': 'error', // in eslint-recommended
        'no-duplicate-imports': 'error',
        'no-else-return': 'error',
        // 'no-empty': 'error', // in eslint-recommended
        // 'no-empty-character-class': 'error', // in eslint-recommended
        'no-empty-function': 'error',
        // 'no-empty-pattern': 'error', // in eslint-recommended
        'no-eq-null': 'error',
        'no-eval': 'error',
        // 'no-ex-assign': 'error', // in eslint-recommended
        'no-extend-native': 'error',
        'no-extra-bind': 'error',
        // 'no-extra-boolean-cast': 'error', // in eslint-recommended
        'no-extra-label': 'error',
        // 'no-extra-parens': 'error', // checked, declined
        // 'no-extra-semi': 'error', // in eslint-recommended
        // 'no-fallthrough': 'error', // in eslint-recommended
        'no-floating-decimal': 'error',
        // 'no-func-assign': 'error', // in eslint-recommended
        // 'no-global-assign': 'error', // in eslint-recommended
        'no-implicit-coercion': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-import-assign': 'error',
        // 'no-inline-comments': 'error', // checked, declined
        // 'no-inner-declarations': 'error', // in eslint-recommended
        // 'no-invalid-regexp': 'error', // in eslint-recommended
        'no-invalid-this': 'error',
        // 'no-irregular-whitespace': 'error', // in eslint-recommended
        'no-iterator': 'error',
        'no-label-var': 'error',
        'no-labels': 'error', // not quire sure if this should be enabled
        'no-lone-blocks': 'error',
        // 'no-lonely-if': 'error', // checked, declined
        'no-loop-func': 'error',
        // 'no-magic-numbers': 'error', // checked, declined
        // 'no-misleading-character-class': 'error', // in eslint-recommended
        // 'no-mixed-operators': 'error', // checked, declined
        'no-mixed-requires': 'error',
        // 'no-mixed-spaces-and-tabs': 'error', // in eslint-recommended
        'no-multi-assign': 'error',
        'no-multi-spaces': [
            'error',
            {
                ignoreEOLComments: true,
                exceptions: {Property: false},
            },
        ],
        'no-multi-str': 'error',
        'no-multiple-empty-lines': ['error', {max: 1}],
        'no-negated-condition': 'error',
        'no-nested-ternary': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-object': 'error',
        'no-new-require': 'error',
        // 'no-new-symbol': 'error', // in eslint-recommended
        'no-new-wrappers': 'error',
        // 'no-obj-calls': 'error', // in eslint-recommended
        // 'no-octal': 'error', // in eslint-recommended
        'no-octal-escape': 'error',
        'no-param-reassign': 'error',
        'no-path-concat': 'error',
        'no-plusplus': ['error', {allowForLoopAfterthoughts: true}],
        // 'no-process-env': 'error', // checked, declined
        // 'no-process-exit': 'error', // checked, declined
        'no-proto': 'error',
        // 'no-prototype-builtins': 'error', // in eslint-recommended
        // 'no-redeclare': 'error', // in eslint-recommended
        // 'no-regex-spaces': 'error', // in eslint-recommended
        // 'no-restricted-globals': 'error', // no forbidden globals defined so far
        // 'no-restricted-imports': 'error', // checked, declined
        // 'no-restricted-modules': 'error', // checked, declined
        // 'no-restricted-properties': 'error', // no forbidden properties defined so far
        'no-restricted-syntax': ['error', 'SequenceExpression'],
        'no-return-assign': 'error',
        'no-return-await': 'error',
        'no-script-url': 'error',
        // 'no-self-assign': 'error', // in eslint-recommended
        'no-self-compare': 'error',
        'no-sequences': 'error',
        'no-setter-return': 'error',
        'no-shadow': ['error', {builtinGlobals: true}],
        // 'no-shadow-restricted-names': 'error', // in eslint-recommended
        // 'no-sparse-arrays': 'error', // in eslint-recommended
        // 'no-sync': 'error', // checked, declined
        'no-tabs': 'error',
        'no-template-curly-in-string': 'error',
        // 'no-ternary': 'error', // checked, declined
        // 'no-this-before-super': 'error', // in eslint-recommended
        'no-throw-literal': 'error',
        'no-trailing-spaces': 'error',
        // 'no-undef': 'error', // in eslint-recommended
        'no-undef-init': 'error',
        // 'no-undefined': 'error', // not needed since no-global-assign and no-shadow-restricted-names are enabled
        // 'no-underscore-dangle': 'error', // checked, declined
        // 'no-unexpected-multiline': 'error', // in eslint-recommended
        'no-unmodified-loop-condition': 'error',
        'no-unneeded-ternary': 'error',
        // 'no-unreachable': 'error', // in eslint-recommended
        // 'no-unsafe-finally': 'error', // in eslint-recommended
        // 'no-unsafe-negation': 'error', // in eslint-recommended
        'no-unused-expressions': 'error',
        // 'no-unused-labels': 'error', // in eslint-recommended
        'no-unused-vars': ['error', {argsIgnorePattern: '_unused(_.+)?'}], // redefine eslint-recommended
        'no-use-before-define': 'error',
        'no-useless-call': 'error',
        // 'no-useless-catch': 'error', // in eslint-recommended
        'no-useless-computed-key': ['error', {enforceForClassMembers: true}],
        'no-useless-concat': 'error',
        'no-useless-constructor': 'error',
        // 'no-useless-escape': 'error', // in eslint-recommended
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        'no-var': 'error',
        'no-void': 'error',
        'no-warning-comments': 'error',
        'no-whitespace-before-property': 'error',
        // 'no-with': 'error', // in eslint-recommended
        // 'nonblock-statement-body-position': 'error', // not needed since if-s without block are not allowed
        'object-curly-newline': 'error',
        'object-curly-spacing': 'error',
        'object-property-newline': ['error', {allowAllPropertiesOnSameLine: true}],
        // 'object-shorthand': 'error', // checked, declined
        'one-var': ['error', {initialized: 'never'}],
        'one-var-declaration-per-line': 'error',
        'operator-assignment': 'error',
        'operator-linebreak': 'error',
        'padded-blocks': ['error', 'never'],
        // 'padding-line-between-statements': 'error', // checked, declined
        // 'prefer-arrow-callback': 'error', // checked, declined
        'prefer-const': 'error',
        // 'prefer-destructuring': 'error', // checked, declined
        'prefer-exponentiation-operator': 'error',
        // 'prefer-named-capture-group': 'error', // checked, declined
        'prefer-numeric-literals': 'error',
        'prefer-object-spread': 'error',
        'prefer-promise-reject-errors': 'error',
        'prefer-regex-literals': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        // 'prefer-template': 'error', // checked, declined
        'quote-props': ['error', 'consistent-as-needed'],
        'quotes': ['error', 'single', {allowTemplateLiterals: false}],
        'radix': 'error',
        'require-atomic-updates': 'error',
        // 'require-await': 'error', // checked, declined
        'require-unicode-regexp': 'error',
        // 'require-yield': 'error', // in eslint-recommended
        'rest-spread-spacing': 'error',
        'semi': 'error',
        'semi-spacing': 'error',
        'semi-style': 'error',
        // 'sort-imports': 'error', // checked, declined
        // 'sort-keys': 'error', // checked, declined
        // 'sort-vars': 'error', // checked, declined
        'space-before-blocks': 'error',
        'space-before-function-paren': ['error', 'never'],
        'space-in-parens': 'error',
        'space-infix-ops': 'error',
        'space-unary-ops': 'error',
        'spaced-comment': 'error',
        'strict': ['error', 'global'],
        'switch-colon-spacing': 'error',
        'symbol-description': 'error',
        'template-curly-spacing': 'error',
        'template-tag-spacing': 'error',
        // 'unicode-bom': 'error', // checked, declined
        // 'use-isnan': 'error', // in eslint-recommended
        // 'valid-typeof': 'error', // in eslint-recommended
        // 'vars-on-top': 'error', // vars should be forbidden
        // 'wrap-iife': 'error', // checked, declined
        // 'wrap-regex': 'error', // checked, declined
        'yield-star-spacing': 'error',
        'yoda': 'error',
    },
};
