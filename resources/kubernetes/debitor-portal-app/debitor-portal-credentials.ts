import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import {provider} from '../../shared/kubernetes/provider.js';
import {namespace} from '../namespace.js';

const config = new pulumi.Config('debitor-portal-app');

const user = config.requireSecret('database-user');
const password = config.requireSecret('database-password');

export const debitorPortalCredentials = new k8s.core.v1.Secret(
	'debitor-portal-database-credentials',
	{
		metadata: {
			name: 'debitor-portal-database-credentials',
			namespace: namespace.metadata.name,
		},
		stringData: {
			PORTAL_USERNAME: user,
			PORTAL_PASSWORD: password,
		},
	},
	{provider},
);
