import {type FlatXoConfig} from 'xo';

const xoConfig: FlatXoConfig = [
	{
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
		},
		prettier: true,
	},
];

export default xoConfig;
