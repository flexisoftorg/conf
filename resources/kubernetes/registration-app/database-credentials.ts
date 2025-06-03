import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import {provider} from '../../shared/kubernetes/provider.js';
import {namespace} from '../namespace.js';

const config = new pulumi.Config('registration-app');

const user = config.requireSecret('database-user');
const password = config.requireSecret('database-password');

export const registrationAppDatabaseCredentials = new k8s.core.v1.Secret(
	'registration-app-database-credentials',
	{
		metadata: {
			name: 'registration-app-database-credentials',
			namespace: namespace.metadata.name,
		},
		stringData: {
			DATABASE_USER: user,
			DATABASE_PASSWORD: password,
		},
	},
	{provider},
);
