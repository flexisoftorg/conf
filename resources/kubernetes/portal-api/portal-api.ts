import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { portalAppDomain } from '../../config';
import { rootDomain } from '../../shared/config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';
import { redis } from './redis';

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
  { provider: kubernetesProvider },
);

export const portalApi = new DeploymentComponent(
  'portal-api',
  {
    image: interpolate`${artifactRepoUrl}/portal-api`,
    tag: config.require('tag'),
    host: cleanPortalApiDomain,
    namespace: namespace.metadata.name,
    port: 8000,
    logLevel: config.get('log-level'),
    envFrom: [
      { secretRef: { name: portalApiEnvSecrets.metadata.name } },
      { configMapRef: { name: customerConfigMap.metadata.name } },
    ],
    env: [
      {
        name: 'FRONTEND_URL',
        value: interpolate`https://${portalAppDomain.slice(0, -1)}`,
      },
      { name: 'SELF_DOMAIN', value: rootDomain.slice(0, -1) },
      { name: 'SELF_URL', value: interpolate`https://${cleanPortalApiDomain}` },
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
