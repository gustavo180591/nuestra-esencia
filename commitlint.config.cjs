module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'body-max-line-length': [0, 'always'],
		'footer-max-line-length': [0, 'always'],
		'header-max-length': [2, 'always', 100],
		'scope-case': [0, 'always'],
		'subject-case': [0, 'always'],
		'subject-empty': [2, 'never'],
		'subject-full-stop': [0, 'always'],
		'type-case': [0, 'always'],
		'type-empty': [2, 'never'],
		'type-enum': [
			2,
			'always',
			['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert']
		]
	}
};
