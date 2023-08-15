/**
 * @type {import('eslint').Linter.Config}
 **/

module.exports = {
  extends: ['@bjerk/eslint-config'],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/no-unassigned-import': 'off',
    'promise/catch-or-return': 'off',
    'promise/always-return': 'off',
  },
};
