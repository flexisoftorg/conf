import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';
import * as kubernetes from '@pulumi/kubernetes';
const config = new pulumi.Config('debitor-portal-app');

const portalUsername = config.requireSecret('portalUsername');
const portalPassword = config.requireSecret('portalPassword');

const debitorPortalCredentials = new kubernetes.core.v1.Secret(
  'debitor-portal-database-credentials',
  {
    metadata: {
      name: 'debitor-portal-database-credentials',
      namespace: namespace.metadata.name,
    },
    stringData: {
      PORTAL_USERNAME: portalUsername,
      PORTAL_PASSWORD: portalPassword,
    },
  },
  { provider: kubernetesProvider },
);

export const debitorPortalApp = new DeploymentComponent(
  'debitor-portal-app',
  {
    image: interpolate`${artifactRepoUrl}/debitor-portal-app`,
    tag: config.require('tag'),
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
      { secretRef: { name: debitorPortalCredentials.metadata.name } },
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
