import * as pulumi from '@pulumi/pulumi';
import {interpolate} from '@pulumi/pulumi';
import {DeploymentComponent} from '../../components/deployment.js';
import {apiDomain} from '../../config.js';
import {artifactRepoUrl} from '../../shared/google/artifact-registry.js';
import {provider as kubernetesProvider} from '../../shared/kubernetes/provider.js';
import {namespace} from '../namespace.js';
import {registrationAppSanityCredentials} from '../registration-app/sanity-credentials.js';

const config = new pulumi.Config('api');

const cleanApiDomain = apiDomain.slice(0, -1);

export const Api = new DeploymentComponent(
	'api',
	{
		image: interpolate`${artifactRepoUrl}/api`,
		tag: config.require('tag'),
		host: cleanApiDomain,
		namespace: namespace.metadata.name,
		envFrom: [
			{secretRef: {name: registrationAppSanityCredentials.metadata.name}},
		],
		port: 8000,
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
