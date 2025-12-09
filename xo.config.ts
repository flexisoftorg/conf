import {type FlatXoConfig} from 'xo';

const xoConfig: FlatXoConfig = [
	{
		ignores: ['node_modules/**', '*.d.ts'],
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
		},
		prettier: true,
	},
];

export default xoConfig;
