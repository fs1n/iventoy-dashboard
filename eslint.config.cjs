module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2021,
      globals: {
        window: 'readonly',
        document: 'readonly'
      }
    },
    rules: {}
  }
];
