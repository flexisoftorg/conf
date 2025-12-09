import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import {interpolate} from '@pulumi/pulumi';
import {DeploymentComponent} from '../../components/deployment.js';
import {artifactRepoUrl} from '../../shared/google/artifact-registry.js';
import {provider as kubernetesProvider} from '../../shared/kubernetes/provider.js';
import {namespace} from '../namespace.js';
import {customers} from '../../get-customers.js';
import {redis} from './redis.js';

const config = new pulumi.Config('portal-api');

const authSignSecret = config.requireSecret('auth-sign-secret');
const cookieSecret = config.requireSecret('cookie-secret');

export const portalApiDomain = config.require('domain');
const cleanPortalApiDomain = portalApiDomain.slice(0, -1);

export const portalApiEnvSecrets = new kubernetes.core.v1.Secret(
	'portal-api-env-secrets',
	{
		metadata: {
			name: 'portal-api-env-secrets',
			namespace: namespace.metadata.name,
		},
		data: {
			COOKIE_SECRET: cookieSecret,
			AUTH_SIGN_SECRET: authSignSecret,
		},
	},
	{provider: kubernetesProvider},
);

export const portalApi = new DeploymentComponent(
	'portal-api',
	{
		image: interpolate`${artifactRepoUrl}/portal-api`,
		tag: config.require('tag'),
		host: cleanPortalApiDomain,
		legacyHost: 'api.flexisoft.bjerk.dev',
		namespace: namespace.metadata.name,
		port: 8000,
		logLevel: config.get('log-level'),
		envFrom: [
			{
				secretRef: {
					name: portalApiEnvSecrets.metadata.name,
				},
			},
		],
		env: [
			{
				name: 'REDIS_URL',
				value: interpolate`redis://${redis.service.metadata.name}.${redis.service.metadata.namespace}.svc.cluster.local:6379`,
			},
			{
				name: 'CUSTOMERS',
				value: customers.apply((customers) =>
					JSON.stringify(
						customers.filter((customer) => customer.portalApiEnabled),
					),
				),
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
