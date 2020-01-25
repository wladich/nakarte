'use strict';

module.exports = {
    extends: ['eslint:recommended'],
    rules: {
        // 'accessor-pairs': 'error',
        // 'array-bracket-newline': 'error',
        // 'array-bracket-spacing': 'error',
        // 'array-callback-return': 'error',
        // 'array-element-newline': 'error',
        // 'arrow-body-style': 'error',
        // 'arrow-parens': 'error',
        // 'arrow-spacing': 'error',
        // 'block-scoped-var': 'error',
        // 'block-spacing': 'error',
        // 'brace-style': 'error',
        // 'callback-return': 'error',
        // 'camelcase': 'error',
        // 'capitalized-comments': 'error',
        // 'class-methods-use-this': 'error',
        // 'comma-dangle': 'error',
        // 'comma-spacing': 'error',
        // 'comma-style': 'error',
        // 'complexity': 'error',
        // 'computed-property-spacing': 'error',
        // 'consistent-return': 'error',
        // 'consistent-this': 'error',
        // 'constructor-super': 'error', // in eslint-recommended
        // 'curly': 'error',
        // 'default-case': 'error',
        // 'default-param-last': 'error',
        // 'dot-location': 'error',
        // 'dot-notation': 'error',
        'eol-last': 'error',
        // 'eqeqeq': 'error',
        // 'for-direction': 'error', // in eslint-recommended
        // 'func-call-spacing': 'error',
        // 'func-name-matching': 'error',
        // 'func-names': 'error',
        // 'func-style': 'error',
        // 'function-call-argument-newline': 'error',
        // 'function-paren-newline': 'error',
        // 'generator-star-spacing': 'error',
        // 'getter-return': 'error', // in eslint-recommended
        // 'global-require': 'error',
        // 'grouped-accessor-pairs': 'error',
        // 'guard-for-in': 'error',
        // 'handle-callback-err': 'error',
        // 'id-blacklist': 'error',
        // 'id-length': 'error',
        // 'id-match': 'error',
        // 'implicit-arrow-linebreak': 'error',
        // 'indent': 'error',
        // 'init-declarations': 'error',
        // 'jsx-quotes': 'error',
        // 'key-spacing': 'error',
        // 'keyword-spacing': 'error',
        // 'line-comment-position': 'error',
        // 'linebreak-style': 'error',
        // 'lines-around-comment': 'error',
        // 'lines-between-class-members': 'error',
        // 'max-classes-per-file': 'error',
        // 'max-depth': 'error',
        // 'max-len': 'error',
        // 'max-lines': 'error',
        // 'max-lines-per-function': 'error',
        // 'max-nested-callbacks': 'error',
        // 'max-params': 'error',
        // 'max-statements': 'error',
        // 'max-statements-per-line': 'error',
        // 'multiline-comment-style': 'error',
        // 'multiline-ternary': 'error',
        // 'new-cap': 'error',
        // 'new-parens': 'error',
        // 'newline-per-chained-call': 'error',
        // 'no-alert': 'error',
        // 'no-array-constructor': 'error',
        // 'no-async-promise-executor': 'error', // in eslint-recommended
        // 'no-await-in-loop': 'error',
        // 'no-bitwise': 'error',
        // 'no-buffer-constructor': 'error',
        // 'no-caller': 'error',
        // 'no-case-declarations': 'error', // in eslint-recommended
        // 'no-class-assign': 'error', // in eslint-recommended
        // 'no-compare-neg-zero': 'error', // in eslint-recommended
        // 'no-cond-assign': 'error', // in eslint-recommended
        // 'no-confusing-arrow': 'error',
        // 'no-console': 'error',
        // 'no-const-assign': 'error', // in eslint-recommended
        // 'no-constant-condition': 'error', // in eslint-recommended
        // 'no-constructor-return': 'error',
        // 'no-continue': 'error',
        // 'no-control-regex': 'error', // in eslint-recommended
        // 'no-debugger': 'error', // in eslint-recommended
        // 'no-delete-var': 'error', // in eslint-recommended
        // 'no-div-regex': 'error',
        // 'no-dupe-args': 'error', // in eslint-recommended
        // 'no-dupe-class-members': 'error', // in eslint-recommended
        // 'no-dupe-else-if': 'error',
        // 'no-dupe-keys': 'error', // in eslint-recommended
        // 'no-duplicate-case': 'error', // in eslint-recommended
        // 'no-duplicate-imports': 'error',
        // 'no-else-return': 'error',
        // 'no-empty': 'error', // in eslint-recommended
        // 'no-empty-character-class': 'error', // in eslint-recommended
        // 'no-empty-function': 'error',
        // 'no-empty-pattern': 'error', // in eslint-recommended
        // 'no-eq-null': 'error',
        // 'no-eval': 'error',
        // 'no-ex-assign': 'error', // in eslint-recommended
        // 'no-extend-native': 'error',
        // 'no-extra-bind': 'error',
        // 'no-extra-boolean-cast': 'error', // in eslint-recommended
        // 'no-extra-label': 'error',
        // 'no-extra-parens': 'error',
        // 'no-extra-semi': 'error', // in eslint-recommended
        // 'no-fallthrough': 'error', // in eslint-recommended
        // 'no-floating-decimal': 'error',
        // 'no-func-assign': 'error', // in eslint-recommended
        // 'no-global-assign': 'error', // in eslint-recommended
        // 'no-implicit-coercion': 'error',
        // 'no-implicit-globals': 'error',
        // 'no-implied-eval': 'error',
        // 'no-import-assign': 'error',
        // 'no-inline-comments': 'error',
        // 'no-inner-declarations': 'error', // in eslint-recommended
        // 'no-invalid-regexp': 'error', // in eslint-recommended
        // 'no-invalid-this': 'error',
        // 'no-irregular-whitespace': 'error', // in eslint-recommended
        // 'no-iterator': 'error',
        // 'no-label-var': 'error',
        // 'no-labels': 'error',
        // 'no-lone-blocks': 'error',
        // 'no-lonely-if': 'error',
        // 'no-loop-func': 'error',
        // 'no-magic-numbers': 'error',
        // 'no-misleading-character-class': 'error', // in eslint-recommended
        // 'no-mixed-operators': 'error',
        // 'no-mixed-requires': 'error',
        // 'no-mixed-spaces-and-tabs': 'error', // in eslint-recommended
        // 'no-multi-assign': 'error',
        // 'no-multi-spaces': 'error',
        // 'no-multi-str': 'error',
        // 'no-multiple-empty-lines': 'error',
        // 'no-negated-condition': 'error',
        // 'no-nested-ternary': 'error',
        // 'no-new': 'error',
        // 'no-new-func': 'error',
        // 'no-new-object': 'error',
        // 'no-new-require': 'error',
        // 'no-new-symbol': 'error', // in eslint-recommended
        // 'no-new-wrappers': 'error',
        // 'no-obj-calls': 'error', // in eslint-recommended
        // 'no-octal': 'error', // in eslint-recommended
        // 'no-octal-escape': 'error',
        // 'no-param-reassign': 'error',
        // 'no-path-concat': 'error',
        // 'no-plusplus': 'error',
        // 'no-process-env': 'error',
        // 'no-process-exit': 'error',
        // 'no-proto': 'error',
        // 'no-prototype-builtins': 'error', // in eslint-recommended
        // 'no-redeclare': 'error', // in eslint-recommended
        // 'no-regex-spaces': 'error', // in eslint-recommended
        // 'no-restricted-globals': 'error',
        // 'no-restricted-imports': 'error',
        // 'no-restricted-modules': 'error',
        // 'no-restricted-properties': 'error',
        // 'no-restricted-syntax': 'error',
        // 'no-return-assign': 'error',
        // 'no-return-await': 'error',
        // 'no-script-url': 'error',
        // 'no-self-assign': 'error', // in eslint-recommended
        // 'no-self-compare': 'error',
        // 'no-sequences': 'error',
        // 'no-setter-return': 'error',
        // 'no-shadow': 'error',
        // 'no-shadow-restricted-names': 'error', // in eslint-recommended
        // 'no-sparse-arrays': 'error', // in eslint-recommended
        // 'no-sync': 'error',
        // 'no-tabs': 'error',
        // 'no-template-curly-in-string': 'error',
        // 'no-ternary': 'error',
        // 'no-this-before-super': 'error', // in eslint-recommended
        // 'no-throw-literal': 'error',
        // 'no-trailing-spaces': 'error',
        // 'no-undef': 'error', // in eslint-recommended
        // 'no-undef-init': 'error',
        // 'no-undefined': 'error',
        // 'no-underscore-dangle': 'error',
        // 'no-unexpected-multiline': 'error', // in eslint-recommended
        // 'no-unmodified-loop-condition': 'error',
        // 'no-unneeded-ternary': 'error',
        // 'no-unreachable': 'error', // in eslint-recommended
        // 'no-unsafe-finally': 'error', // in eslint-recommended
        // 'no-unsafe-negation': 'error', // in eslint-recommended
        // 'no-unused-expressions': 'error',
        // 'no-unused-labels': 'error', // in eslint-recommended
        // 'no-unused-vars': 'error', // in eslint-recommended
        // 'no-use-before-define': 'error',
        // 'no-useless-call': 'error',
        // 'no-useless-catch': 'error', // in eslint-recommended
        // 'no-useless-computed-key': 'error',
        // 'no-useless-concat': 'error',
        // 'no-useless-constructor': 'error',
        // 'no-useless-escape': 'error', // in eslint-recommended
        // 'no-useless-rename': 'error',
        // 'no-useless-return': 'error',
        // 'no-var': 'error',
        // 'no-void': 'error',
        // 'no-warning-comments': 'error',
        // 'no-whitespace-before-property': 'error',
        // 'no-with': 'error', // in eslint-recommended
        // 'nonblock-statement-body-position': 'error',
        // 'object-curly-newline': 'error',
        // 'object-curly-spacing': 'error',
        // 'object-property-newline': 'error',
        // 'object-shorthand': 'error',
        // 'one-var': 'error',
        // 'one-var-declaration-per-line': 'error',
        // 'operator-assignment': 'error',
        // 'operator-linebreak': 'error',
        // 'padded-blocks': 'error',
        // 'padding-line-between-statements': 'error',
        // 'prefer-arrow-callback': 'error',
        // 'prefer-const': 'error',
        // 'prefer-destructuring': 'error',
        // 'prefer-exponentiation-operator': 'error',
        // 'prefer-named-capture-group': 'error',
        // 'prefer-numeric-literals': 'error',
        // 'prefer-object-spread': 'error',
        // 'prefer-promise-reject-errors': 'error',
        // 'prefer-regex-literals': 'error',
        // 'prefer-rest-params': 'error',
        // 'prefer-spread': 'error',
        // 'prefer-template': 'error',
        // 'quote-props': 'error',
        // 'quotes': 'error',
        // 'radix': 'error',
        // 'require-atomic-updates': 'error',
        // 'require-await': 'error',
        // 'require-unicode-regexp': 'error',
        // 'require-yield': 'error', // in eslint-recommended
        // 'rest-spread-spacing': 'error',
        'semi': 'error',
        // 'semi-spacing': 'error',
        // 'semi-style': 'error',
        // 'sort-imports': 'error',
        // 'sort-keys': 'error',
        // 'sort-vars': 'error',
        // 'space-before-blocks': 'error',
        // 'space-before-function-paren': 'error',
        // 'space-in-parens': 'error',
        // 'space-infix-ops': 'error',
        // 'space-unary-ops': 'error',
        // 'spaced-comment': 'error',
        // 'strict': 'error',
        // 'switch-colon-spacing': 'error',
        // 'symbol-description': 'error',
        // 'template-curly-spacing': 'error',
        // 'template-tag-spacing': 'error',
        // 'unicode-bom': 'error',
        // 'use-isnan': 'error', // in eslint-recommended
        // 'valid-typeof': 'error', // in eslint-recommended
        // 'vars-on-top': 'error',
        // 'wrap-iife': 'error',
        // 'wrap-regex': 'error',
        // 'yield-star-spacing': 'error',
        // 'yoda': 'error'
    }
};
