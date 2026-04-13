import architectConfig from '@architect/eslint-config'

export default [
  ...architectConfig,
  {
    ignores: [
      'coverage/**',
      'db/*Parser.js',
      'dist-test/**',
      'test/**/*.ts',
    ],
  },
  {
    files: [ 'test/**/*.js', 'test/**/*.ts' ],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
  {
    // Override filename rule to allow camelCase (which this project uses extensively)
    rules: {
      'arc/match-regex': 'off',
    },
  },
]
