module.exports = {
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	env: {
		browser: true,
	},
	parserOptions: {
		requireConfigFile: false,
		babelOptions: {
			presets: [ '@wordpress/babel-preset-default' ],
		},
	},
	rules: {
		'no-console': 'off',
	},
	overrides: [
		{
			files: [ 'tests/**/*.js', 'tests/__mocks__/**/*.js' ],
			env: {
				jest: true,
			},
			rules: {
				'jsdoc/check-tag-names': [
					'error',
					{
						definedTags: [ 'jest-environment' ],
					},
				],
			},
		},
	],
};
