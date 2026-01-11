module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
};
