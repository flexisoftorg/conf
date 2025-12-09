import * as pulumi from '@pulumi/pulumi';
import {interpolate} from '@pulumi/pulumi';
import {DeploymentComponent} from '../../components/deployment.js';
import {registrationAppDomain} from '../../config.js';
import {artifactRepoUrl} from '../../shared/google/artifact-registry.js';
import {provider as kubernetesProvider} from '../../shared/kubernetes/provider.js';
import {namespace} from '../namespace.js';
import {registrationAppDatabaseCredentials} from './database-credentials.js';
import {registrationAppSanityCredentials} from './sanity-credentials.js';

const config = new pulumi.Config('registration-app');

const cleanRegistrationAppDomain = registrationAppDomain.slice(0, -1);

export const registrationApp = new DeploymentComponent(
	'registration-app',
	{
		image: interpolate`${artifactRepoUrl}/registration-app`,
		tag: config.require('tag'),
		host: cleanRegistrationAppDomain,
		namespace: namespace.metadata.name,
		port: 8000,
		envFrom: [
			{
				secretRef: {
					name: registrationAppSanityCredentials
						.metadata.name,
				},
			},
			{
				secretRef: {
					name: registrationAppDatabaseCredentials
						.metadata.name,
				},
			},
		],
		env: [
			{
				name: 'SELF_URL',
				value: `https://${cleanRegistrationAppDomain}`,
			},
			{
				name: 'APP_ENV',
				value: 'production',
			},
		],
		resources: {
			requests: {
				cpu: '250m',
				memory: '512Mi',
			},
			limits: {
				cpu: '250m',
				memory: '512Mi',
			},
		},
	},
	{provider: kubernetesProvider},
);
