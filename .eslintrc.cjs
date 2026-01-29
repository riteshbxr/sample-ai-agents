module.exports = {
  env: {
    node: true,
    es2024: true,
  },
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    // Variables
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',

    // Best practices
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'prefer-template': 'warn',
    'object-shorthand': ['warn', 'always'],
    'prefer-arrow-callback': 'warn',
    'no-throw-literal': 'error',

    // Async/await
    'no-async-promise-executor': 'error',
    'require-await': 'off', // Interface methods often throw without await
    'no-return-await': 'off', // Can be useful for stack traces

    // Code quality
    'no-duplicate-imports': 'error',
    'no-useless-rename': 'error',
    'prefer-destructuring': ['warn', { object: true, array: false }],
  },
};
