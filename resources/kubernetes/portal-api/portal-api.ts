import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';
import { redis } from './redis';

const config = new pulumi.Config('portal-api');

const authSignSecret = config.requireSecret('auth-sign-secret');
const cookieSecret = config.requireSecret('cookie-secret');

const portalApiEnvSecrets = new kubernetes.core.v1.Secret(
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
  { provider: kubernetesProvider },
);

export const portalApi = new DeploymentComponent(
  'portal-api',
  {
    image: interpolate`${artifactRepoUrl}/portal-api`,
    tag: config.require('tag'),
    namespace: namespace.metadata.name,
    port: 8000,
    logLevel: config.get('log-level'),
    envFrom: [
      { secretRef: { name: portalApiEnvSecrets.metadata.name } },
      { configMapRef: { name: customerConfigMap.metadata.name } },
    ],
    env: [
      // TODO: Remove FRONTEND_URL, SELF_URL and SELF_DOMAIN once tenant configs are added to API and Portal
      {
        name: 'FRONTEND_URL',
        value: 'https://flexisoft.bjerk.dev',
      },
      { name: 'SELF_URL', value: 'https://api.flexisoft.bjerk.dev' },
      { name: 'SELF_DOMAIN', value: 'flexisoft.bjerk.dev' },
      {
        name: 'REDIS_URL',
        value: interpolate`redis://${redis.service.metadata.name}.${redis.service.metadata.namespace}.svc.cluster.local:6379`,
      },
    ],
    resources: {
      requests: {
        cpu: '100m',
        memory: '128Mi',
      },
      limits: {
        cpu: '200m',
        memory: '256Mi',
      },
    },
  },
  { provider: kubernetesProvider },
);
