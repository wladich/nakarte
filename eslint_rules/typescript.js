'use strict';

module.exports = {
    plugins: ['@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
        project: 'tsconfig.json',
    },
    rules: {
        // Base eslint rules made obsolete by Typescript
        'consistent-return': 'off',

        // Normal typescript rules
        '@typescript-eslint/adjacent-overload-signatures': 'error',
        '@typescript-eslint/array-type': ['error', {default: 'generic'}],
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/ban-ts-comment': 'error',
        '@typescript-eslint/ban-tslint-comment': 'error',
        '@typescript-eslint/ban-types': 'error',
        '@typescript-eslint/class-literal-property-style': ['error', 'fields'],
        '@typescript-eslint/consistent-type-assertions': [
            'error',
            {
                assertionStyle: 'as',
                objectLiteralTypeAssertions: 'never',
            },
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        // '@typescript-eslint/consistent-type-imports': 'error', // can conflict with no-duplicate-imports
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/explicit-member-accessibility': [
            'error',
            {
                accessibility: 'explicit',
                overrides: {constructors: 'no-public'},
            },
        ],
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/member-delimiter-style': 'error',
        '@typescript-eslint/member-ordering': 'error',
        '@typescript-eslint/method-signature-style': ['error', 'property'],
        // '@typescript-eslint/naming-convention': 'error', // too much efforts to configure
        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-confusing-non-null-assertion': 'error',
        '@typescript-eslint/no-dynamic-delete': 'error',
        '@typescript-eslint/no-empty-interface': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-extra-non-null-assertion': 'error',
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-floating-promises': ['error', {ignoreVoid: false, ignoreIIFE: false}],
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-implicit-any-catch': 'error',
        '@typescript-eslint/no-implied-eval': 'error',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-invalid-void-type': 'error',
        '@typescript-eslint/no-misused-new': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-namespace': 'error',
        '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        // '@typescript-eslint/no-parameter-properties': 'error', // can be used for data only classes
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-throw-literal': 'error',
        // '@typescript-eslint/no-type-alias': 'error', // checked, declined
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error', // maybe add {allowConstantLoopConditions: true}
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        // '@typescript-eslint/no-unnecessary-type-arguments': 'error', // checked, declined
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-call': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/no-unsafe-return': 'error',
        '@typescript-eslint/no-var-requires': 'error',
        '@typescript-eslint/prefer-as-const': 'error',
        '@typescript-eslint/prefer-enum-initializers': 'error',
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-literal-enum-member': 'error',
        // '@typescript-eslint/prefer-namespace-keyword': 'error', // checked, not needed
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        // '@typescript-eslint/prefer-readonly-parameter-types': 'error', // checked, declined
        '@typescript-eslint/prefer-reduce-type-parameter': 'error',
        '@typescript-eslint/prefer-regexp-exec': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        // '@typescript-eslint/promise-function-async': 'error', // checked, did not get it
        '@typescript-eslint/require-array-sort-compare': 'error',
        '@typescript-eslint/restrict-plus-operands': ['error', {checkCompoundAssignments: true}],
        '@typescript-eslint/restrict-template-expressions': 'error',
        '@typescript-eslint/strict-boolean-expressions': [
            'error',
            {
                allowString: false,
                allowNumber: false,
                allowNullableObject: true,
                allowNullableBoolean: false,
                allowNullableString: false,
                allowNullableNumber: false,
                allowAny: false,
            },
        ],
        'default-case': ['error', {commentPattern: '^no default'}],
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/triple-slash-reference': ['error', {path: 'never', types: 'never', lib: 'never'}],
        '@typescript-eslint/type-annotation-spacing': 'error',
        // '@typescript-eslint/typedef': 'error', // checked, declined
        '@typescript-eslint/unbound-method': 'error',
        '@typescript-eslint/unified-signatures': 'error',

        /* Extension Rules
        In some cases, ESLint provides a rule itself, but it doesn't support TypeScript syntax;
        either it crashes, or it ignores the syntax, or it falsely reports against it.
        In these cases, we create what we call an extension rule;
        a rule within our plugin that has the same functionality, but also supports TypeScript. */
        'brace-style': 'off',
        '@typescript-eslint/brace-style': 'error',
        // '@typescript-eslint/comma-dangle': 'error, // disabled by prettier
        'comma-spacing': 'off',
        '@typescript-eslint/comma-spacing': 'error',
        'default-param-last': 'off',
        '@typescript-eslint/default-param-last': 'error',
        'dot-notation': 'off',
        '@typescript-eslint/dot-notation': 'error',
        'func-call-spacing': 'off',
        '@typescript-eslint/func-call-spacing': 'error',
        'indent': 'off',
        // maybe broken: https://github.com/typescript-eslint/typescript-eslint/issues/1824
        '@typescript-eslint/indent': 'error',
        // '@typescript-eslint/init-declarations': 'error', // disabled in base config
        'keyword-spacing': 'off',
        '@typescript-eslint/keyword-spacing': 'error',
        'lines-between-class-members': 'off',
        '@typescript-eslint/lines-between-class-members': ['error', 'always', {exceptAfterSingleLine: true}],
        'no-array-constructor': 'off',
        '@typescript-eslint/no-array-constructor': 'error',
        'no-dupe-class-members': 'off',
        '@typescript-eslint/no-dupe-class-members': 'error',
        'no-empty-function': 'off',
        '@typescript-eslint/no-empty-function': 'error',
        // '@typescript-eslint/no-extra-parens': 'error', // disabled in base config
        'no-extra-semi': 'off',
        '@typescript-eslint/no-extra-semi': 'error',
        'no-invalid-this': 'off',
        '@typescript-eslint/no-invalid-this': 'error',
        'no-loop-func': 'off',
        '@typescript-eslint/no-loop-func': 'error',
        'no-loss-of-precision': 'off',
        '@typescript-eslint/no-loss-of-precision': 'error',
        // '@typescript-eslint/no-magic-numbers': 'error', // disable in base config
        'no-redeclare': 'off',
        '@typescript-eslint/no-redeclare': 'error',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': [
            'error',
            {
                builtinGlobals: true,
                ignoreTypeValueShadow: false,
                ignoreFunctionTypeParameterNameValueShadow: false,
            },
        ],
        'no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-expressions': 'error',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '_unused(_.+)?'}],
        // possibly has issues: https://github.com/typescript-eslint/typescript-eslint/issues/1856
        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': 'error',
        'no-useless-constructor': 'off',
        '@typescript-eslint/no-useless-constructor': 'error',
        'quotes': 'off',
        '@typescript-eslint/quotes': ['error', 'single', {allowTemplateLiterals: false}],
        // '@typescript-eslint/require-await': 'error',
        'no-return-await': 'off',
        '@typescript-eslint/return-await': 'error',
        'semi': 'off',
        '@typescript-eslint/semi': 'error',
        'space-before-function-paren': 'off',
        '@typescript-eslint/space-before-function-paren': ['error', 'never'],
    },
};
