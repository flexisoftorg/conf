import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { portalAppDomain } from '../../config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';

const config = new pulumi.Config('portal-app');
const agGridLicenseKey = config.requireSecret('ag-grid-license-key');

export const portalAppEnvSecrets = new kubernetes.core.v1.Secret(
  'portal-api-env-secrets',
  {
    metadata: {
      name: 'portal-app-env-secrets',
      namespace: namespace.metadata.name,
    },
    data: {
      AG_GRID_LICENSE_KEY: agGridLicenseKey,
    },
  },
  { provider: kubernetesProvider },
);

const cleanPortalAppDomain = portalAppDomain.slice(0, -1);

export const portalApp = new DeploymentComponent(
  'portal-app',
  {
    image: interpolate`${artifactRepoUrl}/portal-app`,
    tag: config.require('tag'),
    host: cleanPortalAppDomain,
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
      { secretRef: { name: portalAppEnvSecrets.metadata.name } }
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
  { provider: kubernetesProvider },
);
