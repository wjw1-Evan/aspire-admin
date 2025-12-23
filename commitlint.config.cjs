module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit format; subject must not be empty
    'subject-empty': [2, 'never'],
    // Optionally enforce max length
    'header-max-length': [2, 'always', 150]
  }
};
